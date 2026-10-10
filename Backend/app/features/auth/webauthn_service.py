import json
import time
import uuid
import logging
from typing import Optional
from fastapi import Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    AuthenticatorAttachment,
    UserVerificationRequirement,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
)
from webauthn.helpers import base64url_to_bytes, bytes_to_base64url

from app.features.auth.models import User, PasskeyCredential
from app.core.config import get_settings
from app.core.security import create_access_token
from datetime import timedelta

logger = logging.getLogger(__name__)
settings = get_settings()

# In-memory challenge store with automatic expiration (5 minutes)
CHALLENGE_STORE: dict[str, dict] = {}


def _cleanup_challenges():
    now = time.time()
    expired = [k for k, v in CHALLENGE_STORE.items() if v["expires_at"] < now]
    for k in expired:
        CHALLENGE_STORE.pop(k, None)


def store_challenge(key: str, challenge: bytes, ttl_seconds: int = 300):
    _cleanup_challenges()
    CHALLENGE_STORE[key] = {
        "challenge": challenge,
        "expires_at": time.time() + ttl_seconds
    }


def pop_challenge(key: str) -> Optional[bytes]:
    _cleanup_challenges()
    data = CHALLENGE_STORE.pop(key, None)
    if data and data["expires_at"] >= time.time():
        return data["challenge"]
    return None


from urllib.parse import urlparse

def _is_localhost_allowed() -> bool:
    """Check if localhost is permitted explicitly by environment configuration."""
    return bool(getattr(settings, "ALLOW_LOCALHOST_AUTH", False))


def _is_trusted_origin(origin_url: str, request: Request) -> bool:
    """Validate that the origin belongs to an authorized host."""
    if not origin_url:
        return False
    try:
        parsed = urlparse(origin_url)
        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False

        # 1. Localhost - only allowed if explicitly enabled via ALLOW_LOCALHOST_AUTH env var
        if hostname in ("localhost", "127.0.0.1", "::1"):
            return _is_localhost_allowed()

        # 2. Configured frontend origin
        if getattr(settings, "FRONTEND_ORIGIN", None):
            fe_host = (urlparse(settings.FRONTEND_ORIGIN).hostname or "").lower()
            if fe_host and (hostname == fe_host or hostname.endswith(f".{fe_host}")):
                return True

        # 3. Explicitly configured allowed origins in env
        allowed_origins = getattr(settings, "ALLOWED_ORIGINS", []) or []
        for allowed in allowed_origins:
            parsed_allowed = (urlparse(allowed).hostname or allowed).strip().lower()
            if parsed_allowed and (hostname == parsed_allowed or hostname.endswith(f".{parsed_allowed}")):
                return True

        # 4. Request host or reverse-proxy forwarded host (excluding localhost unless explicitly enabled)
        req_host = (
            request.headers.get("x-forwarded-host")
            or request.headers.get("host")
            or request.url.hostname
            or ""
        ).split(":")[0].strip().lower()
        if req_host:
            if req_host in ("localhost", "127.0.0.1", "::1") and not _is_localhost_allowed():
                return False
            if hostname == req_host or hostname.endswith(f".{req_host}"):
                return True

        # 5. Standard cloud deploy hosts (HF spaces, Vercel)
        if hostname.endswith(".hf.space") or hostname.endswith(".vercel.app"):
            return True

        return False
    except Exception:
        return False


def get_rp_info(request: Request) -> tuple[str, str]:
    """
    Extract rp_id and expected_origin dynamically from the incoming request.
    WebAuthn requires rp_id to match the client's web domain (Origin / Referer),
    validated against trusted domains to prevent host/origin injection.
    """
    # 1. Check client's Origin / Referer / custom X-Client-Origin header
    client_target = (
        request.headers.get("x-client-origin")
        or request.headers.get("origin")
        or request.headers.get("referer")
    )

    if client_target:
        if "," in client_target:
            client_target = client_target.split(",")[0].strip()
        parsed = urlparse(client_target)
        if parsed.hostname and _is_trusted_origin(client_target, request):
            rp_id = parsed.hostname.replace(",", ".").strip()
            expected_origin = f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
            return rp_id, expected_origin

    # 2. Fallback to settings.FRONTEND_ORIGIN (if not localhost or if localhost is explicitly allowed)
    if getattr(settings, "FRONTEND_ORIGIN", None):
        parsed = urlparse(settings.FRONTEND_ORIGIN)
        if parsed.hostname:
            fe_host = parsed.hostname.strip().lower()
            if fe_host not in ("localhost", "127.0.0.1", "::1") or _is_localhost_allowed():
                return fe_host.replace(",", "."), settings.FRONTEND_ORIGIN.rstrip("/")

    # 3. Fallback to request host
    host_header = (
        request.headers.get("x-forwarded-host")
        or request.headers.get("host")
        or request.url.hostname
        or ""
    )
    if "," in host_header:
        host_header = host_header.split(",")[0].strip()

    hostname = host_header.split(":")[0].replace(",", ".").strip().lower()
    if not hostname or (hostname in ("localhost", "127.0.0.1", "::1") and not _is_localhost_allowed()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid relying party domain. Localhost is disabled."
        )

    scheme = request.headers.get("x-forwarded-proto") or request.url.scheme or "https"
    expected_origin = f"{scheme}://{host_header}".rstrip("/")

    return hostname, expected_origin


class WebAuthnService:
    @staticmethod
    async def get_registration_options(user: User, request: Request, db: AsyncSession) -> dict:
        rp_id, _ = get_rp_info(request)
        
        # Check existing credentials to exclude re-registering the same authenticator
        result = await db.execute(select(PasskeyCredential).where(PasskeyCredential.user_id == user.id))
        existing_creds = result.scalars().all()
        exclude_credentials = []
        for cred in existing_creds:
            try:
                exclude_credentials.append(
                    PublicKeyCredentialDescriptor(id=base64url_to_bytes(cred.id))
                )
            except Exception:
                pass

        options = generate_registration_options(
            rp_id=rp_id,
            rp_name="Grip",
            user_id=str(user.id).encode("utf-8"),
            user_name=user.email,
            user_display_name=user.full_name or user.email,
            authenticator_selection=AuthenticatorSelectionCriteria(
                authenticator_attachment=AuthenticatorAttachment.PLATFORM,  # Enforce built-in Touch ID / Fingerprint / Face ID
                user_verification=UserVerificationRequirement.REQUIRED,
                resident_key=ResidentKeyRequirement.REQUIRED,  # Stores discoverable Passkey in device keychain/cloud
            ),
            exclude_credentials=exclude_credentials if exclude_credentials else None,
            timeout=60000
        )

        challenge_key = f"reg_{user.id}"
        store_challenge(challenge_key, options.challenge)

        return json.loads(options_to_json(options))

    @staticmethod
    async def verify_registration(
        user: User,
        credential_data: dict,
        device_name: str,
        request: Request,
        db: AsyncSession
    ) -> dict:
        rp_id, expected_origin = get_rp_info(request)
        challenge_key = f"reg_{user.id}"
        expected_challenge = pop_challenge(challenge_key)

        if not expected_challenge:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration session expired. Please try again."
            )

        try:
            verified = verify_registration_response(
                credential=credential_data,
                expected_challenge=expected_challenge,
                expected_rp_id=rp_id,
                expected_origin=expected_origin,
                require_user_verification=True
            )
        except Exception as e:
            logger.error(f"WebAuthn registration verification error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Biometric verification failed: {str(e)}"
            )

        cred_id = credential_data.get("id") or bytes_to_base64url(verified.credential_id)

        # Store in database
        passkey = PasskeyCredential(
            id=cred_id,
            user_id=user.id,
            public_key=verified.credential_public_key,
            sign_count=verified.sign_count,
            device_name=device_name or "Fingerprint / Biometric Sensor"
        )
        db.add(passkey)
        await db.commit()

        return {
            "success": True,
            "message": "Fingerprint / Biometric credential enrolled successfully",
            "device_name": passkey.device_name
        }

    @staticmethod
    async def get_unlock_options(user: User, request: Request, db: AsyncSession) -> dict:
        rp_id, _ = get_rp_info(request)

        result = await db.execute(select(PasskeyCredential).where(PasskeyCredential.user_id == user.id))
        creds = result.scalars().all()

        if not creds:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No biometrics registered for this account"
            )

        allow_credentials = []
        for c in creds:
            try:
                allow_credentials.append(
                    PublicKeyCredentialDescriptor(id=base64url_to_bytes(c.id))
                )
            except Exception:
                pass

        options = generate_authentication_options(
            rp_id=rp_id,
            allow_credentials=allow_credentials,
            user_verification=UserVerificationRequirement.REQUIRED,
            timeout=60000
        )

        challenge_key = f"unlock_{user.id}"
        store_challenge(challenge_key, options.challenge)

        return json.loads(options_to_json(options))

    @staticmethod
    async def verify_unlock(
        user: User,
        credential_data: dict,
        request: Request,
        db: AsyncSession
    ) -> dict:
        rp_id, expected_origin = get_rp_info(request)
        challenge_key = f"unlock_{user.id}"
        expected_challenge = pop_challenge(challenge_key)

        if not expected_challenge:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Biometric verification timed out. Please try again."
            )

        cred_id = credential_data.get("id")
        result = await db.execute(
            select(PasskeyCredential).where(
                PasskeyCredential.id == cred_id,
                PasskeyCredential.user_id == user.id
            )
        )
        passkey = result.scalar_one_or_none()

        if not passkey:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Unrecognized biometric credential"
            )

        try:
            verified = verify_authentication_response(
                credential=credential_data,
                expected_challenge=expected_challenge,
                expected_rp_id=rp_id,
                expected_origin=expected_origin,
                credential_public_key=passkey.public_key,
                credential_current_sign_count=passkey.sign_count,
                require_user_verification=True
            )
        except Exception as e:
            logger.error(f"WebAuthn unlock verification error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Biometric verification failed: {str(e)}"
            )

        passkey.sign_count = verified.new_sign_count
        await db.commit()

        return {"valid": True}

    @staticmethod
    async def get_login_options(
        email: Optional[str],
        credential_id: Optional[str],
        request: Request,
        db: AsyncSession
    ) -> dict:
        rp_id, _ = get_rp_info(request)

        allow_credentials = None

        # 1. If explicit credential_id was provided from the requesting client device (cached locally)
        if credential_id:
            cred_res = await db.execute(
                select(PasskeyCredential.id).where(PasskeyCredential.id == credential_id)
            )
            if cred_res.scalar_one_or_none():
                try:
                    allow_credentials = [
                        PublicKeyCredentialDescriptor(id=base64url_to_bytes(credential_id))
                    ]
                except Exception as e:
                    logger.warning(f"Could not parse credential_id {credential_id}: {e}")

        # 2. Or if email was provided (identifier-first authentication)
        if not allow_credentials and email:
            result = await db.execute(select(User).where(User.email == email.strip().lower()))
            user = result.scalar_one_or_none()
            if user:
                creds_res = await db.execute(select(PasskeyCredential).where(PasskeyCredential.user_id == user.id))
                creds = creds_res.scalars().all()
                if creds:
                    descriptors = []
                    for c in creds:
                        try:
                            descriptors.append(PublicKeyCredentialDescriptor(id=base64url_to_bytes(c.id)))
                        except Exception:
                            pass
                    if descriptors:
                        allow_credentials = descriptors

        # 3. If neither credential_id nor email was provided:
        # allow_credentials remains None, following the official W3C WebAuthn / FIDO2 specification
        # for discoverable credentials (Passkeys). The client platform authenticator will
        # look up the resident key for this rp_id. No other user credentials are ever exposed.

        options = generate_authentication_options(
            rp_id=rp_id,
            allow_credentials=allow_credentials,
            user_verification=UserVerificationRequirement.REQUIRED,
            timeout=60000
        )

        session_id = str(uuid.uuid4())
        store_challenge(f"login_{session_id}", options.challenge)

        return {
            "options": json.loads(options_to_json(options)),
            "challenge_id": session_id
        }

    @staticmethod
    async def verify_login(
        challenge_id: str,
        credential_data: dict,
        request: Request,
        db: AsyncSession
    ) -> dict:
        rp_id, expected_origin = get_rp_info(request)
        expected_challenge = pop_challenge(f"login_{challenge_id}")

        if not expected_challenge:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Login session expired. Please tap to try again."
            )

        cred_id = credential_data.get("id")
        result = await db.execute(
            select(PasskeyCredential)
            .options(selectinload(PasskeyCredential.user))
            .where(PasskeyCredential.id == cred_id)
        )
        passkey = result.scalar_one_or_none()

        if not passkey or not passkey.user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Passkey credential not recognized"
            )

        if not passkey.user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is inactive"
            )

        try:
            verified = verify_authentication_response(
                credential=credential_data,
                expected_challenge=expected_challenge,
                expected_rp_id=rp_id,
                expected_origin=expected_origin,
                credential_public_key=passkey.public_key,
                credential_current_sign_count=passkey.sign_count,
                require_user_verification=True
            )
        except Exception as e:
            logger.error(f"WebAuthn login verification error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Fingerprint login failed: {str(e)}"
            )

        from datetime import datetime, timezone
        passkey.sign_count = verified.new_sign_count
        passkey.last_used_at = datetime.now(timezone.utc)
        if passkey.user:
            passkey.user.last_active_at = datetime.now(timezone.utc)
        await db.commit()

        # Generate JWT Token for user
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": passkey.user.email},
            expires_delta=access_token_expires
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "email": passkey.user.email,
            "full_name": passkey.user.full_name
        }
