from typing import Annotated
import logging
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, Header, status
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession
from google_auth_oauthlib.flow import Flow
from app.core.database import get_db
from app.core.config import get_settings
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.sync.service import SyncService
import base64
import json
from datetime import datetime, timezone
from app.features.sync.models import SyncLog
from app.features.transactions.models import Transaction

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
        scopes=[
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/gmail.readonly"
        ],
        autogenerate_code_verifier=False
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
    logger.info("Generated OAuth URL successfully")
    
    return {"url": auth_url}

@router.post("/google/callback")
async def google_callback(
    payload: dict,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    code = payload.get("code")
    redirect_uri = payload.get("redirect_uri", "postmessage")
    
    logger.info(f"Received Google callback for user {str(current_user.id)[:8]}")
    
    if not code:
        logger.error("No code provided in callback payload")
        raise HTTPException(status_code=400, detail="Missing code")
        
    flow = get_google_flow(redirect_uri)
    try:
        # Fetch token using the authorization code
        logger.debug("Fetching token for authorization code...")
        flow.fetch_token(code=code)
        creds = flow.credentials
        logger.info(f"Successfully fetched token for user {str(current_user.id)[:8]}")
        
        # Fresh fetch from DB to avoid session/detachment issues
        user_stmt = select(User).where(User.id == current_user.id)
        result = await db.execute(user_stmt)
        db_user = result.scalar_one_or_none()
        
        if not db_user:
            logger.error(f"User {str(current_user.id)[:8]} not found in DB during callback")
            raise HTTPException(status_code=404, detail="User not found")
            
        # Update credentials
        db_user.gmail_credentials = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "expiry": creds.expiry.isoformat() if creds.expiry else None
        }
        
        # PROACTIVE: Fetch user profile name if not already set
        try:
            from googleapiclient.discovery import build
            user_info_service = build('oauth2', 'v2', credentials=creds)
            user_info = user_info_service.userinfo().get().execute()
            if user_info and user_info.get("name"):
                db_user.full_name = user_info.get("name")
                logger.info(f"Extracted profile name for user {str(db_user.id)[:8]}")
        except Exception as profile_ex:
            logger.warning(f"Failed to fetch profile info for user {str(current_user.id)[:8]}: {profile_ex}")

        # PROACTIVE: Setup Gmail Push Notifications
        if settings.GMAIL_PUBSUB_TOPIC:
            try:
                gmail_service = build('gmail', 'v1', credentials=creds)
                watch_request = {
                    'labelIds': ['INBOX'],
                    'topicName': settings.GMAIL_PUBSUB_TOPIC
                }
                watch_response = gmail_service.users().watch(userId='me', body=watch_request).execute()
                logger.info(f"Successfully enabled Gmail push notifications for user {str(db_user.id)[:8]}")
            except Exception as watch_ex:
                logger.warning(f"Failed to enable Gmail push notifications for user {str(db_user.id)[:8]}: {watch_ex}")

        await db.commit()
        logger.info(f"Committed Gmail credentials for user {str(current_user.id)[:8]}")
        
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Token exchange failed for user {str(current_user.id)[:8]}: {type(e).__name__}")
        raise HTTPException(status_code=400, detail="Invalid authorization code")

@router.post("/webhook", status_code=status.HTTP_202_ACCEPTED)
@router.post("/webhook/", status_code=status.HTTP_202_ACCEPTED)
async def webhook_ingress(
    payload: dict, 
    background_tasks: BackgroundTasks, 
    service: Annotated[SyncService, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
    token: str = None
):
    # Google Pub/Sub sends push tokens via query param usually
    if token and token != settings.GRIP_SECRET:
         # SANITIZED: Do not print the actual token or secret to logs
         logger.warning("Webhook received with invalid token.")
         raise HTTPException(status_code=401, detail="Unauthorized")

    message = payload.get("message", {})
    data_b64 = message.get("data")
    if not data_b64:
        logger.warning(f"Webhook received without data payload.")
        return {"status": "ignored"}
        
    try:
        data_str = base64.b64decode(data_b64).decode("utf-8")
        data_json = json.loads(data_str)
        email = data_json.get("emailAddress")
        historyId = data_json.get("historyId")
        logger.info("Webhook payload decoded successfully.")
    except Exception as e:
        logger.error(f"Failed to decode Pub/Sub message: {e}")
        return {"status": "invalid_payload"}

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
    
    # Get total synced count directly from automated transactions
    count_stmt = (
        select(func.count(Transaction.id))
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.is_manual == False)
    )
    total_synced = (await db.execute(count_stmt)).scalar() or 0
    
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
    
    logger.info(f"User {str(current_user.id)[:8]} disconnected Gmail")
    return {"status": "disconnected"}

@router.get("/history")
async def get_sync_history(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 20
):
    """Get sync history for the user with live validation status."""
    stmt = (
        select(SyncLog)
        .where(SyncLog.user_id == current_user.id)
        .order_by(desc(SyncLog.start_time))
        .limit(limit)
    )
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    # Collect all transaction IDs to hydrate their latest live validation status
    all_txn_ids = []
    parsed_summaries = {}
    import uuid
    for log in logs:
        if log.summary:
            try:
                data = json.loads(log.summary)
                parsed_summaries[log.id] = data
                if isinstance(data, dict) and "items" in data:
                    for it in data["items"]:
                        tid = it.get("transaction_id")
                        if tid:
                            try:
                                all_txn_ids.append(uuid.UUID(str(tid)))
                            except (ValueError, TypeError):
                                pass
            except Exception:
                pass

    # Auto-heal only truly abandoned sync jobs (no activity/heartbeat for > 25 minutes)
    now = datetime.now(timezone.utc)
    stale_recovered = False
    for log in logs:
        if log.status == "IN_PROGRESS" and log.start_time:
            summary_info = parsed_summaries.get(log.id, {})
            last_activity_str = summary_info.get("last_activity") if isinstance(summary_info, dict) else None
            
            # Use last heartbeat if available, otherwise fallback to start_time
            last_active = None
            if last_activity_str:
                try:
                    last_active = datetime.fromisoformat(last_activity_str)
                    if not last_active.tzinfo:
                        last_active = last_active.replace(tzinfo=timezone.utc)
                except Exception:
                    pass
            
            if not last_active:
                last_active = log.start_time if log.start_time.tzinfo else log.start_time.replace(tzinfo=timezone.utc)
            
            # An active sync taking 15-20+ minutes on CPU or large batches is healthy.
            # Only mark dead if it had ZERO activity for > 25 minutes (1500 seconds).
            if (now - last_active).total_seconds() > 1500:
                log.status = "FAILED"
                log.error_message = "Sync timed out (no activity for 25 minutes)"
                log.end_time = datetime.now()
                stale_recovered = True
    if stale_recovered:
        await db.commit()

    # Batch query live transaction status
    live_status_map = {}
    if all_txn_ids:
        txn_stmt = select(Transaction.id, Transaction.status).where(Transaction.id.in_(all_txn_ids))
        txn_res = await db.execute(txn_stmt)
        for t_id, t_status in txn_res.all():
            live_status_map[str(t_id)] = t_status

    # Build response payload with live validation status
    sync_records = []
    for log in logs:
        summary_payload = log.summary
        if log.id in parsed_summaries:
            data = parsed_summaries[log.id]
            if isinstance(data, dict) and "items" in data and live_status_map:
                for it in data["items"]:
                    tid = it.get("transaction_id")
                    if tid and str(tid) in live_status_map:
                        it["validation_status"] = live_status_map[str(tid)]
                summary_payload = json.dumps(data)

        sync_records.append({
            "id": log.id,
            "start_time": log.start_time,
            "end_time": log.end_time,
            "status": log.status,
            "records_processed": log.records_processed,
            "trigger_source": log.trigger_source,
            "error_message": log.error_message,
            "summary": summary_payload
        })

    return {"syncs": sync_records}

@router.get("/trends")
async def get_sync_trends(
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[SyncService, Depends()],
    days: int = 30
):
    """Get sync trends for the user."""
    trends = await service.get_sync_trends(current_user.id, days)
    return {"trends": trends}
