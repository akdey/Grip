
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.config import get_settings
from app.features.wealth.service import WealthService
from app.features.sync.service import SyncService
from app.features.transactions.service import TransactionService
from app.features.categories.service import CategoryService
from app.features.auth.models import User
from sqlalchemy import select

logger = logging.getLogger(__name__)
settings = get_settings()

scheduler = AsyncIOScheduler()

async def run_daily_price_sync():
    """
    Task to sync prices for all investment holdings.
    Runs daily.
    """
    logger.info("Starting Daily Price Sync...")
    async with AsyncSessionLocal() as db:
        service = WealthService(db)
        try:
            # We need to implement sync_all_holdings in WealthService first
            await service.sync_all_holdings_prices() 
            logger.info("Daily Price Sync Completed Successfully.")
        except Exception as e:
            logger.error(f"Daily Price Sync Failed: {e}", exc_info=True)

async def run_gmail_sync():
    """
    Task to sync Gmail transactions for all users.
    """
    logger.info("Starting Gmail Sync...")
    async with AsyncSessionLocal() as db:
        # Instantiate services
        cat_service = CategoryService(db)
        wealth_service = WealthService(db)
        txn_service = TransactionService(db) # TransactionService only needs db in __init__
        sync_service = SyncService(db, txn_service, cat_service, wealth_service)
        
        # Fetch users with gmail credentials
        stmt = select(User).where(User.gmail_credentials.isnot(None))
        result = await db.execute(stmt)
        users = result.scalars().all()
        
        logger.info(f"Found {len(users)} users with Gmail credentials.")
        
        for user in users:
            try:
                logger.info(f"Syncing Gmail for user {user.id}...")
                await sync_service.execute_sync(user.id, "SCHEDULED_TASK")
            except Exception as e:
                logger.error(f"Gmail sync failed for user {user.id}: {e}")
                
    logger.info("Gmail Sync Completed.")

def start_scheduler():
    """
    Start the scheduler if ENABLE_SCHEDULER is True.
    Set ENABLE_SCHEDULER=False when using external cron (e.g., GitHub Actions).
    """
    if not settings.ENABLE_SCHEDULER:
        logger.info("Scheduler disabled (ENABLE_SCHEDULER=False). Using external cron.")
        return
    
    # Schedule the job to run at 3:30 PM IST (10:00 AM UTC)
    # IST is UTC+5:30. 15:30 IST = 10:00 UTC.
    trigger = CronTrigger(hour=10, minute=0)  # 10:00 AM UTC = 3:30 PM IST
    
    scheduler.add_job(run_daily_price_sync, trigger)
    scheduler.start()
    logger.info("Scheduler started. Jobs scheduled.")
