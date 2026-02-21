
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
from app.features.notifications.service import NotificationService
from sqlalchemy import select, and_
from datetime import datetime, date, timedelta

logger = logging.getLogger(__name__)
settings = get_settings()

scheduler = AsyncIOScheduler()

async def run_daily_price_sync():
    """
    Task to sync prices for all investment holdings.
    Runs daily.
    """
    logger.info("Starting Daily Price Sync...")
    from app.features.auth.models import User
    from app.features.wealth.models import InvestmentHolding, InvestmentSnapshot
    from app.features.credit_cards.models import CreditCard
    from app.features.bills.models import Bill
    
    async with AsyncSessionLocal() as db:
        service = WealthService(db)
        try:
            # We need to implement sync_all_holdings in WealthService first
            await service.sync_all_holdings_prices() 
            logger.info("Daily Price Sync Completed Successfully.")
        except Exception as e:
            logger.error(f"Daily Price Sync Failed: {e}", exc_info=True)

async def run_surety_reminders():
    """
    Check for payments due today or in the next 3 days and send notifications.
    """
    logger.info("Starting Surety Reminders Scan...")
    from app.features.bills.models import Bill
    from app.features.auth.models import User
    from app.features.credit_cards.models import CreditCard
    from app.features.transactions.models import Transaction
    from app.features.wealth.models import InvestmentHolding
    
    today = date.today()
    reminder_window = today + timedelta(days=3)
    
    async with AsyncSessionLocal() as db:
        notification_service = NotificationService(db)
        
        # Check explicit bills, join with User for personalization
        stmt = (
            select(Bill, User.full_name)
            .join(User, Bill.user_id == User.id)
            .where(
                and_(
                    Bill.due_date >= today,
                    Bill.due_date <= reminder_window,
                    Bill.is_paid == False
                )
            )
        )
        
        result = await db.execute(stmt)
        upcoming_data = result.all()
        
        for bill, full_name in upcoming_data:
            try:
                await notification_service.send_surety_reminder(
                    bill.user_id, 
                    full_name,
                    bill.title, 
                    float(bill.amount), 
                    datetime.combine(bill.due_date, datetime.min.time())
                )
                logger.info(f"Sent reminder for bill: {bill.title}")
            except Exception as e:
                logger.error(f"Failed to send reminder for bill {bill.id}: {e}")
                
    logger.info("Surety Reminders Completed.")

async def run_weekly_insights():
    """
    Analyze spending for the last 7 days and send insights if growth is detected.
    """
    logger.info("Starting Weekly Insights Analysis...")
    from sqlalchemy import func
    from app.features.transactions.models import Transaction
    from app.features.auth.models import User
    from app.features.credit_cards.models import CreditCard
    from app.features.bills.models import Bill
    from app.features.wealth.models import InvestmentHolding
    
    async with AsyncSessionLocal() as db:
        notification_service = NotificationService(db)
        
        # Simple Logic: Find categories where spend > 0 in last 7 days
        seven_days_ago = datetime.now() - timedelta(days=7)
        
        stmt = (
            select(User.id, User.full_name, Transaction.category, func.sum(Transaction.amount).label("total"))
            .join(Transaction, User.id == Transaction.user_id)
            .where(Transaction.transaction_date >= seven_days_ago.date())
            .group_by(User.id, User.full_name, Transaction.category)
        )
        
        result = await db.execute(stmt)
        data = result.all()
        
        for user_id, full_name, category, total in data:
            # If spending in a category is > 5000 in a week, send a "watchout" alert
            # This is a placeholder for more complex logic later
            if abs(total) > 5000:
                try:
                    await notification_service.send_spending_insight(
                        user_id, 
                        full_name,
                        category, 
                        25.0 # Mock percentage for now
                    )
                except Exception as e:
                    logger.error(f"Failed to send insight for user {user_id}: {e}")

    logger.info("Weekly Insights Completed.")

async def run_gmail_sync():
    """
    Task to sync Gmail transactions for all users.
    """
    logger.info("Starting Gmail Sync...")
    async with AsyncSessionLocal() as db:
        # Import models inside function to avoid circular imports and ensure registry is ready
        from app.features.auth.models import User
        # Ensure relationships are loaded
        from app.features.credit_cards.models import CreditCard
        from app.features.bills.models import Bill
        
        # Instantiate services
        cat_service = CategoryService(db)
        wealth_service = WealthService(db)
        txn_service = TransactionService(db)
        notif_service = NotificationService(db)
        sync_service = SyncService(db, txn_service, cat_service, wealth_service, notif_service)
        
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
    
    # Run Gmail sync every hour
    scheduler.add_job(run_gmail_sync, 'interval', hours=1)
    
    # Run Surety reminders daily at 9:00 AM IST (3:30 AM UTC)
    reminder_trigger = CronTrigger(hour=3, minute=30)
    scheduler.add_job(run_surety_reminders, reminder_trigger)
    
    # Run Weekly Insights on Sunday at 10:00 AM IST (4:30 AM UTC)
    insight_trigger = CronTrigger(day_of_week='sun', hour=4, minute=30)
    scheduler.add_job(run_weekly_insights, insight_trigger)
    
    scheduler.start()
    logger.info("Scheduler started. Jobs scheduled.")
