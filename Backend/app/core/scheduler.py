
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.features.wealth.service import WealthService

logger = logging.getLogger(__name__)

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

def start_scheduler():
    # Schedule the job to run at 9:00 PM IST (21:00) 
    # Or maybe 9:00 PM UTC? Prompt said "9:00 PM IST".
    # IST is UTC+5:30. 21:00 IST is 15:30 UTC.
    # APScheduler uses system time by default. If server is UTC, we need 15:30.
    # But let's assume we can set timezone or use server time. 
    # Safest is to specify timezone if possible, or just convert.
    # Let's stick to 21:00 assuming server might be local or we want 9pm local.
    
    # Actually, Render usually runs in UTC. 
    # 9:00 PM IST = 15:30 UTC.
    
    trigger = CronTrigger(hour=15, minute=30) 
    
    scheduler.add_job(run_daily_price_sync, trigger)
    scheduler.start()
    logger.info("Scheduler started. Jobs scheduled.")
