from typing import Annotated
import logging
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Header, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from google_auth_oauthlib.flow import Flow

from app.core.database import get_db
from app.core.config import get_settings
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.sync.service import SyncService
from app.features.sync.models import SyncLog

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()

def get_google_flow(redirect_uri: str = None):
    if redirect_uri is None:
        redirect_uri = settings.GOOGLE_REDIRECT_URI
    
    # Check credentials
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        logger.error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth credentials not configured on server"
        )
    
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/v2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri] if redirect_uri else []
            }
        },
        scopes=["https://www.googleapis.com/auth/gmail.readonly"]
    )
    flow.redirect_uri = redirect_uri
    return flow

@router.get("/google/auth")
async def google_auth(
    current_user: Annotated[User, Depends(get_current_user)],
    redirect_uri: str | None = None
):
    # Validate FRONTEND_ORIGIN is configured
    if not settings.FRONTEND_ORIGIN:
        logger.error("FRONTEND_ORIGIN is not configured in environment variables")
        raise HTTPException(
            status_code=500, 
            detail="OAuth configuration error: FRONTEND_ORIGIN not set"
        )
    
    flow = get_google_flow(redirect_uri)
    
    # Standard OAuth 2.0 authorization URL generation
    auth_url, _ = flow.authorization_url(
        access_type='offline',
        prompt='consent',
        include_granted_scopes='true'
    )
    
    effective_redirect = redirect_uri or settings.GOOGLE_REDIRECT_URI
    logger.info(f"Generated OAuth URL with redirect_uri: {effective_redirect}")
    
    return {"url": auth_url}

@router.post("/google/callback")
async def google_callback(
    payload: dict,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    code = payload.get("code")
    redirect_uri = payload.get("redirect_uri", "postmessage")
    
    logger.info(f"Received Google callback for user {current_user.email} with redirect_uri: {redirect_uri}")
    
    if not code:
        logger.error("No code provided in callback payload")
        raise HTTPException(status_code=400, detail="Missing code")
        
    flow = get_google_flow(redirect_uri)
    try:
        # Fetch token using the authorization code
        logger.debug(f"Fetching token for code: {code[:10]}...")
        flow.fetch_token(code=code)
        creds = flow.credentials
        logger.info(f"Successfully fetched token for {current_user.email}")
        
        # Fresh fetch from DB to avoid session/detachment issues
        user_stmt = select(User).where(User.id == current_user.id)
        result = await db.execute(user_stmt)
        db_user = result.scalar_one_or_none()
        
        if not db_user:
            logger.error(f"User {current_user.id} not found in DB during callback")
            raise HTTPException(status_code=404, detail="User not found")
            
        # Update credentials
        db_user.gmail_credentials = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "expiry": creds.expiry.isoformat() if creds.expiry else None
        }
        
        await db.commit()
        logger.info(f"Committed Gmail credentials for {current_user.email}")
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Token exchange failed for {current_user.email}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Invalid authorization code: {str(e)}")

@router.post("/webhook", status_code=status.HTTP_202_ACCEPTED)
async def webhook_ingress(
    payload: dict, 
    background_tasks: BackgroundTasks, 
    service: Annotated[SyncService, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
    x_grip_secret: Annotated[str | None, Header()] = None
):
    if x_grip_secret != settings.GRIP_SECRET:
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

@router.get("/status")
async def get_sync_status(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Check if user has Gmail connected and get sync status."""
    has_credentials = current_user.gmail_credentials is not None
    
    if not has_credentials:
        return {
            "connected": False,
            "email": None,
            "last_sync": None,
            "total_synced": 0
        }
    
    # Get last successful sync
    stmt = (
        select(SyncLog)
        .where(SyncLog.user_id == current_user.id)
        .where(SyncLog.status == "SUCCESS")
        .order_by(desc(SyncLog.start_time))
        .limit(1)
    )
    result = await db.execute(stmt)
    last_sync = result.scalar_one_or_none()
    
    # Get total synced count
    count_stmt = (
        select(SyncLog)
        .where(SyncLog.user_id == current_user.id)
        .where(SyncLog.status == "SUCCESS")
    )
    count_result = await db.execute(count_stmt)
    all_syncs = count_result.scalars().all()
    total_synced = sum(log.records_processed for log in all_syncs)
    
    return {
        "connected": True,
        "email": current_user.email,
        "last_sync": last_sync.start_time if last_sync else None,
        "total_synced": total_synced
    }

@router.delete("/disconnect")
async def disconnect_gmail(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Disconnect Gmail and remove stored credentials."""
    if not current_user.gmail_credentials:
        raise HTTPException(status_code=400, detail="Gmail not connected")
    
    current_user.gmail_credentials = None
    await db.commit()
    
    logger.info(f"User {current_user.email} disconnected Gmail")
    return {"status": "disconnected"}

@router.get("/history")
async def get_sync_history(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 20
):
    """Get sync history for the user."""
    stmt = (
        select(SyncLog)
        .where(SyncLog.user_id == current_user.id)
        .order_by(desc(SyncLog.start_time))
        .limit(limit)
    )
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    return {
        "syncs": [
            {
                "id": log.id,
                "start_time": log.start_time,
                "end_time": log.end_time,
                "status": log.status,
                "records_processed": log.records_processed,
                "trigger_source": log.trigger_source,
                "error_message": log.error_message
            }
            for log in logs
        ]
    }
