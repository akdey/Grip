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
from app.features.auth.models import User
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
            await db.commit()
            is_new_user = True

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
