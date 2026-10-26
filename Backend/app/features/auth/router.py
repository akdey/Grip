from datetime import timedelta, datetime, timezone
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.features.auth.models import User, PasskeyCredential
from app.features.auth import schemas
from app.core.config import get_settings
from app.core.llm import get_llm_service
from app.features.notifications.service import NotificationService

import logging
import random
import string

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)

class GoogleLoginRequest(BaseModel):
    token: str

@router.post("/register", response_model=dict)
async def register_user(
    user_in: schemas.UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    background_tasks: BackgroundTasks
):
    # Check if user exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing_user = result.scalar_one_or_none()
    
    from app.core.email import send_otp_email

    otp = ''.join(random.choices(string.digits, k=6))
    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)

    if existing_user:
        if existing_user.is_active:
            raise HTTPException(
                status_code=400,
                detail="User with this email already exists"
            )
        else:
            # Resend OTP
            existing_user.hashed_password = get_password_hash(user_in.password)
            existing_user.verification_code = otp
            existing_user.verification_code_expires_at = otp_expiry
            db.add(existing_user)
            await db.commit()
            
            background_tasks.add_task(send_otp_email, user_in.email, otp)
            return {"message": "OTP sent to email", "email": user_in.email}
    
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        is_active=False,
        verification_code=otp,
        verification_code_expires_at=otp_expiry
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    background_tasks.add_task(send_otp_email, user_in.email, otp)
    return {"message": "OTP sent to email", "email": user_in.email}

@router.post("/google/one-tap", response_model=schemas.Token)
async def google_one_tap(
    payload: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    background_tasks: BackgroundTasks
):
    """
    Combined Login + Gmail Sync authorization.
    Exchanges an Authorization Code for tokens, registers the user, 
    and saves Gmail credentials in one go.
    """
    from app.features.sync.router import get_google_flow
    
    code = payload.get("code")
    redirect_uri = payload.get("redirect_uri", "postmessage")
    
    if not code:
        raise HTTPException(status_code=400, detail="Missing authorization code")

    try:
        # 1. Exchange Code for Tokens
        flow = get_google_flow(redirect_uri)
        flow.fetch_token(code=code)
        creds = flow.credentials
        
        # 2. Extract Identity from ID Token
        # We need to manually verify the ID token if fetch_token doesn't expose it ready-to-use
        # or use creds.id_token
        id_info = id_token.verify_oauth2_token(
            creds.id_token, 
            google_requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )
        
        email = id_info['email']
        full_name = id_info.get('name')

        # 3. Handle User Record
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        is_new_user = False
        if not user:
            user = User(
                email=email,
                full_name=full_name,
                is_active=True,
                hashed_password="EXTERNAL_AUTH_GOOGLE"
            )
            db.add(user)
            is_new_user = True
        
        # 4. Save Gmail Credentials
        # We store the dict format of credentials
        user.gmail_credentials = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": creds.scopes
        }
        user.is_active = True # Ensure they are active if they reconnect
        user.last_active_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(user)

        # 5. Welcome Email for New Users
        if is_new_user:
            from app.features.notifications.service import NotificationService
            llm = get_llm_service()
            notif_service = NotificationService(db, llm)
            background_tasks.add_task(notif_service.send_welcome_email, email, full_name)

        # 6. Generate Grip Token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}

    except Exception as e:
        logger.error(f"Google One-Tap Error: {e}")
        raise HTTPException(status_code=400, detail=f"Authentication failed: {str(e)}")

@router.post("/google-login", response_model=schemas.Token)
async def google_login(
    login_data: GoogleLoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    background_tasks: BackgroundTasks
):
    """Verifies Google ID Token and logs the user in (or registers them)."""
    try:
        idinfo = id_token.verify_oauth2_token(
            login_data.token, 
            google_requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )

        email = idinfo['email']
        full_name = idinfo.get('name')

        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        is_new_user = False
        if not user:
            user = User(
                email=email,
                full_name=full_name,
                is_active=True,
                hashed_password="EXTERNAL_AUTH_GOOGLE"
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            is_new_user = True
        elif not user.is_active:
            user.is_active = True
        user.last_active_at = datetime.now(timezone.utc)
        await db.commit()

        if is_new_user:
            llm = get_llm_service()
            notif_service = NotificationService(db, llm)
            background_tasks.add_task(notif_service.send_welcome_email, email, full_name)

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception as e:
        logger.error(f"Google Login error: {e}")
        raise HTTPException(status_code=400, detail="Invalid Google token")

@router.post("/verify-otp", response_model=schemas.Token)
async def verify_otp(
    verify_in: schemas.VerifyOTP,
    db: Annotated[AsyncSession, Depends(get_db)],
    background_tasks: BackgroundTasks
):
    result = await db.execute(select(User).where(User.email == verify_in.email))
    user = result.scalar_one_or_none()

    if not user or user.verification_code != verify_in.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if user.verification_code_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")

    user.is_active = True
    user.last_active_at = datetime.now(timezone.utc)
    user.verification_code = None
    user.verification_code_expires_at = None
    await db.commit()
    
    llm = get_llm_service()
    notif_service = NotificationService(db, llm)
    background_tasks.add_task(notif_service.send_welcome_email, user.email, user.full_name)

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User not verified")
    user.last_active_at = datetime.now(timezone.utc)
    await db.commit()
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

from app.features.auth.deps import get_current_user
@router.post("/verify")
async def verify_user_password(
    data: schemas.PasswordVerification,
    current_user: Annotated[User, Depends(get_current_user)]
):
    if not verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid password")
    return {"valid": True}


# =========================================================================
# BIOMETRICS & WEBAUTHN (FINGERPRINT / PASSKEYS)
# =========================================================================
from app.features.auth.webauthn_service import WebAuthnService
from fastapi import Request

@router.get("/biometrics/status")
async def get_biometrics_status(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    result = await db.execute(
        select(PasskeyCredential).where(PasskeyCredential.user_id == current_user.id)
    )
    creds = result.scalars().all()
    return {
        "has_biometrics": len(creds) > 0,
        "count": len(creds),
        "devices": [
            {"id": c.id, "device_name": c.device_name, "created_at": c.created_at}
            for c in creds
        ]
    }

@router.post("/biometrics/register/options")
async def get_biometrics_register_options(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    return await WebAuthnService.get_registration_options(current_user, request, db)

class BiometricsRegisterVerifyPayload(BaseModel):
    credential: dict
    device_name: Optional[str] = "Fingerprint Sensor"

@router.post("/biometrics/register/verify")
async def verify_biometrics_registration(
    payload: BiometricsRegisterVerifyPayload,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    return await WebAuthnService.verify_registration(
        current_user,
        payload.credential,
        payload.device_name or "Fingerprint Sensor",
        request,
        db
    )

@router.post("/biometrics/unlock/options")
async def get_biometrics_unlock_options(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    return await WebAuthnService.get_unlock_options(current_user, request, db)

class BiometricsAssertionPayload(BaseModel):
    credential: dict

@router.post("/biometrics/unlock/verify")
async def verify_biometrics_unlock(
    payload: BiometricsAssertionPayload,
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    return await WebAuthnService.verify_unlock(
        current_user,
        payload.credential,
        request,
        db
    )

class BiometricsLoginOptionsPayload(BaseModel):
    email: Optional[str] = None
    credential_id: Optional[str] = None

@router.post("/biometrics/login/options")
async def get_biometrics_login_options(
    request: Request,
    payload: Optional[BiometricsLoginOptionsPayload] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None
):
    email = payload.email if payload else None
    credential_id = payload.credential_id if payload else None
    return await WebAuthnService.get_login_options(email, credential_id, request, db)

class BiometricsLoginVerifyPayload(BaseModel):
    challenge_id: str
    credential: dict

@router.post("/biometrics/login/verify")
async def verify_biometrics_login(
    payload: BiometricsLoginVerifyPayload,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    return await WebAuthnService.verify_login(
        payload.challenge_id,
        payload.credential,
        request,
        db
    )


def parse_and_validate_emails(raw_val: Optional[str]) -> tuple[Optional[str], list[str]]:
    import re
    from email_validator import validate_email, EmailNotValidError
    if not raw_val or not raw_val.strip():
        return None, []
    # Split by comma, semicolon, newline, or whitespace
    tokens = [e.strip() for e in re.split(r'[,;\n\r]+', raw_val) if e.strip()]
    cleaned = []
    seen = set()
    for token in tokens:
        try:
            valid = validate_email(token, check_deliverability=False)
            normalized = valid.normalized.lower()
        except EmailNotValidError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid email address: '{token}'"
            )
        if normalized not in seen:
            seen.add(normalized)
            cleaned.append(normalized)
    if not cleaned:
        return None, []
    return ", ".join(cleaned), cleaned


@router.get("/emergency-contact", response_model=schemas.EmergencyContactResponse)
async def get_emergency_contact(
    current_user: Annotated[User, Depends(get_current_user)]
):
    _, emails = parse_and_validate_emails(current_user.emergency_contact_email)
    return {
        "emergency_contact_email": current_user.emergency_contact_email,
        "last_active_at": current_user.last_active_at.isoformat() if current_user.last_active_at else None,
        "emails": emails,
    }


@router.put("/emergency-contact", response_model=schemas.EmergencyContactResponse)
async def update_emergency_contact(
    data: schemas.EmergencyContactUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    from sqlalchemy import update
    email_val, emails = parse_and_validate_emails(data.emergency_contact_email)
    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(emergency_contact_email=email_val)
    )
    await db.commit()
    current_user.emergency_contact_email = email_val
    return {
        "emergency_contact_email": current_user.emergency_contact_email,
        "last_active_at": current_user.last_active_at.isoformat() if current_user.last_active_at else None,
        "emails": emails,
    }


@router.post("/emergency-contact/test")
async def test_emergency_contact(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Sends a test portfolio statement email to all registered contingency contacts.
    """
    import asyncio
    import zoneinfo
    from app.core.config import get_settings
    from app.core.email import send_email
    from app.features.export.service import generate_portfolio_statement_excel

    raw = current_user.emergency_contact_email or ""
    _, emails = parse_and_validate_emails(raw)
    if not emails:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No emergency contact emails configured. Please add and save at least one email first."
        )

    settings = get_settings()
    tz = zoneinfo.ZoneInfo(settings.APP_TIMEZONE)
    user_name = current_user.full_name or current_user.email.split('@')[0].replace('.', ' ').title()
    today_str = datetime.now(tz).strftime("%Y-%m-%d")
    clean_email_prefix = current_user.email.split('@')[0]
    filename = f"Grip_Asset_Schedule_{clean_email_prefix}_{today_str}.xlsx"

    # Generate the actual portfolio statement Excel file
    try:
        excel_stream = await generate_portfolio_statement_excel(db, current_user)
        excel_bytes = excel_stream.getvalue()
    except Exception as e:
        logger.error(f"Error generating portfolio excel for test: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate asset spreadsheet: {str(e)}"
        )

    subject = f"[TEST] Confidential Asset Portfolio Statement for {user_name} [Grip Contingency]"
    html_body = f"""
    <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 24px; background-color: #f8fafc;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                <div style="background: #090a0f; padding: 32px; color: #ffffff;">
                    <span style="font-size: 22px; font-weight: 900; letter-spacing: -0.02em; color: #ffffff;">GRIP</span>
                    <span style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 2px; margin-left: 12px;">Test Dispatch</span>
                    <h2 style="color: #ffffff; margin: 20px 0 0 0; font-size: 20px; font-weight: 800;">7-Day Inactivity Contingency Test</h2>
                </div>
                <div style="padding: 32px;">
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; padding: 14px 18px; border-radius: 14px; margin-bottom: 24px; font-size: 13px; font-weight: 600;">
                        ✅ Contingency Test Dispatch: This is a manual test email triggered by {user_name} ({current_user.email}) to verify delivery of their confidential portfolio schedule.
                    </div>
                    <p style="font-size: 14px; color: #475569;">
                        Hello,
                    </p>
                    <p style="font-size: 14px; color: #475569;">
                        You are registered as a designated emergency / contingency contact for <strong>{user_name}</strong> on <strong>Grip</strong>.
                    </p>
                    <div style="background: #f1f5f9; padding: 20px; border-radius: 14px; margin: 24px 0; border: 1px solid #e2e8f0;">
                        <p style="margin: 0; font-size: 13px; color: #334155; font-weight: 600;">
                            How this works in production:
                        </p>
                        <p style="margin: 6px 0 0 0; font-size: 13px; color: #64748b;">
                            If {user_name} is inactive on Grip for {settings.INACTIVITY_THRESHOLD_DAYS} consecutive days, Grip Automated Systems will automatically generate an updated version of the attached schedule and email it to you.
                        </p>
                    </div>
                    <p style="font-size: 13px; color: #475569;">
                        The attached sample Excel file (<strong>{filename}</strong>) contains the current financial asset schedule as recorded in Grip.
                    </p>
                    <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 30px;">
                        Sent securely from Grip Asset Contingency System.
                    </p>
                </div>
            </div>
        </body>
    </html>
    """

    sent_to = []
    failed_to = []
    for dest in emails:
        try:
            success = await asyncio.to_thread(
                send_email,
                to_email=dest,
                subject=subject,
                html_content=html_body,
                attachment_bytes=excel_bytes,
                attachment_filename=filename,
                attachment_mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
            if success:
                sent_to.append(dest)
            else:
                failed_to.append(dest)
        except Exception as send_err:
            logger.error(f"Error sending test email to {dest}: {send_err}")
            failed_to.append(dest)

    if not sent_to and failed_to:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deliver test email to {', '.join(failed_to)}. Please check your SMTP or email relay configuration."
        )

    msg = f"Test statement successfully dispatched to {len(sent_to)} contact(s): {', '.join(sent_to)}"
    if failed_to:
        msg += f" (Failed for: {', '.join(failed_to)})"

    return {
        "status": "success",
        "message": msg,
        "sent_to": sent_to,
        "failed_to": failed_to
    }


