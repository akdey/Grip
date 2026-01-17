from typing import Annotated
import logging
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Header, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from google_auth_oauthlib.flow import Flow

from app.core.database import get_db
from app.core.config import get_settings
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.sync.service import SyncService

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()

def get_google_flow(redirect_uri: str = "postmessage"):
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=["https://www.googleapis.com/auth/gmail.readonly"]
    )
    flow.redirect_uri = redirect_uri
    return flow

@router.get("/google/auth")
async def google_auth(current_user: Annotated[User, Depends(get_current_user)]):
    flow = get_google_flow()
    auth_url, _ = flow.authorization_url(access_type='offline', prompt='consent')
    return {"url": auth_url}

@router.post("/google/callback")
async def google_callback(
    payload: dict,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    code = payload.get("code")
    redirect_uri = payload.get("redirect_uri", "postmessage")
    
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")
        
    flow = get_google_flow(redirect_uri)
    try:
        flow.fetch_token(code=code)
        creds = flow.credentials
        current_user.gmail_credentials = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "expiry": creds.expiry.isoformat() if creds.expiry else None
        }
        await db.commit()
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Token exchange failed: {e}")
        raise HTTPException(status_code=400, detail="Invalid authorization code")

@router.post("/webhook", status_code=status.HTTP_202_ACCEPTED)
async def webhook_ingress(
    payload: dict, 
    background_tasks: BackgroundTasks, 
    service: Annotated[SyncService, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
    x_griply_secret: Annotated[str | None, Header()] = None
):
    if x_griply_secret != settings.GRIPLY_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    email = payload.get("emailAddress")
    if not email:
        return {"status": "ignored"}

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
        return {"status": "user_not_found"}
        
    background_tasks.add_task(service.execute_sync, user.id, "WEBHOOK")
    return {"status": "accepted"}

@router.post("/manual")
async def manual_sync(
    current_user: Annotated[User, Depends(get_current_user)],
    background_tasks: BackgroundTasks,
    service: Annotated[SyncService, Depends()]
):
    background_tasks.add_task(service.execute_sync, current_user.id, "MANUAL")
    return {"status": "started"}
