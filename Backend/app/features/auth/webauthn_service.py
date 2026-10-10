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


def get_rp_info(request: Request) -> tuple[str, str]:
    """
    Extract rp_id and expected_origin dynamically from the incoming request.
    Works for localhost, IP addresses, and production domains.
    """
    origin = request.headers.get("origin")
    referer = request.headers.get("referer")
    
    # 1. Hostname for rp_id (must not contain port)
    host_header = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.hostname or "localhost"
    hostname = host_header.split(":")[0]
    
    # In local development, normalize 127.0.0.1 to localhost if needed, or keep host
    rp_id = hostname

    # 2. Expected origin (full scheme + host + port)
    if origin:
        expected_origin = origin.rstrip("/")
    elif referer:
        # e.g. http://localhost:5173/dashboard -> http://localhost:5173
        parts = referer.split("/")
        expected_origin = f"{parts[0]}//{parts[2]}"
    else:
        scheme = request.headers.get("x-forwarded-proto") or request.url.scheme or "http"
        expected_origin = f"{scheme}://{host_header}"

    return rp_id, expected_origin


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
                user_verification=UserVerificationRequirement.REQUIRED
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
    async def get_login_options(email: Optional[str], request: Request, db: AsyncSession) -> dict:
        rp_id, _ = get_rp_info(request)

        allow_credentials = None
        if email:
            result = await db.execute(select(User).where(User.email == email.strip().lower()))
            user = result.scalar_one_or_none()
            if user:
                creds_res = await db.execute(select(PasskeyCredential).where(PasskeyCredential.user_id == user.id))
                creds = creds_res.scalars().all()
                if creds:
                    allow_credentials = [
                        PublicKeyCredentialDescriptor(id=base64url_to_bytes(c.id))
                        for c in creds
                    ]

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

        passkey.sign_count = verified.new_sign_count
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
