
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import AsyncSessionLocal
from app.core.config import get_settings
from app.features.wealth.service import WealthService
from app.features.sync.service import SyncService
from app.features.transactions.service import TransactionService
from app.features.categories.service import CategoryService
from app.core.llm import get_llm_service
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
    from app.features.auth.models import User
    from app.features.bills.models import Bill
    from app.features.credit_cards.models import CreditCard
    from app.features.notifications.service import NotificationService
    
    today = date.today()
    reminder_window = today + timedelta(days=3)
    
    async with AsyncSessionLocal() as db:
        llm_service = get_llm_service()
        notification_service = NotificationService(db, llm_service)
        
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
    from app.features.auth.models import User
    from app.features.transactions.models import Transaction
    from app.features.bills.models import Bill
    from app.features.credit_cards.models import CreditCard
    from app.features.notifications.service import NotificationService
    
    async with AsyncSessionLocal() as db:
        llm_service = get_llm_service()
        notification_service = NotificationService(db, llm_service)
        
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
        logger.info(f"Weekly Insights: Found {len(data)} user/category pairs with spending.")
        
        for user_id, full_name, category, total in data:
            # LOWERED THRESHOLD FOR TESTING: If spending in a category is > 10 in a week, send a "Roast" alert
            if abs(total) > 10:
                try:
                    await notification_service.send_spending_insight(
                        user_id, 
                        full_name,
                        category, 
                        float(abs(total)),
                        25.0 # Mock percentage
                    )
                    logger.info(f"Sent weekly roast to user {user_id} for {category}")
                except Exception as e:
                    logger.error(f"Failed to send roast for user {user_id}: {e}")
            else:
                logger.info(f"Skip weekly roast for user {user_id}: {category} spend ({abs(total)}) below threshold (5000)")

    logger.info("Weekly Insights Completed.")

async def run_monthly_report(target_date: Optional[date] = None):
    """
    Generate and send a comprehensive monthly report for the previous month.
    Generally runs on the 1st of the month.
    """
    logger.info("Starting Monthly Report Generation...")
    from app.features.auth.models import User
    from app.features.bills.models import Bill
    from app.features.credit_cards.models import CreditCard
    from app.features.analytics.service import AnalyticsService
    
    # If today is March 1st, we want February's data
    ref_date = target_date or date.today()
    if ref_date.day == 1:
        prev_month_date = ref_date - timedelta(days=1)
        month_idx = prev_month_date.month
        year_idx = prev_month_date.year
    else:
        month_idx = ref_date.month
        year_idx = ref_date.year

    async with AsyncSessionLocal() as db:
        from app.features.notifications.service import NotificationService
        notification_service = NotificationService(db)
        analytics_service = AnalyticsService()
        
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        for user in users:
            try:
                # Get full monthly summary & variance
                summary = await analytics_service.get_monthly_summary(db, user.id, month=month_idx, year=year_idx)
                variance = await analytics_service.get_variance_analysis(db, user.id, month=month_idx, year=year_idx)
                
                await notification_service.send_monthly_report(
                    user_id=user.id,
                    full_name=user.full_name,
                    summary=summary,
                    variance=variance
                )
                logger.info(f"Sent monthly report to {user.id} for {month_idx}/{year_idx}")
            except Exception as e:
                logger.error(f"Failed monthly report for {user.id}: {e}")

    logger.info("Monthly Report Job Completed.")
    
async def run_lifestyle_insights(override_date: Optional[date] = None):
    """
    Perform periodic checks for inactivity and special events (like Fridays).
    """
    logger.info(f"Starting Lifestyle Insights Trigger... (Override: {override_date})")
    from app.features.auth.models import User
    from app.features.transactions.models import Transaction
    from app.features.bills.models import Bill
    from app.features.credit_cards.models import CreditCard
    from app.features.analytics.service import AnalyticsService
    from sqlalchemy import func
    
    today = override_date or date.today()
    
    async with AsyncSessionLocal() as db:
        from app.features.notifications.service import NotificationService
        notification_service = NotificationService(db)
        analytics_service = AnalyticsService()
        
        # 1. Fetch all users
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        for user in users:
            try:
                # --- CHECK 1: INACTIVITY ---
                # Check for the last transaction date
                stmt = select(func.max(Transaction.transaction_date)).where(Transaction.user_id == user.id)
                res = await db.execute(stmt)
                last_txn_date = res.scalar()
                
                if last_txn_date:
                    days_diff = (today - last_txn_date).days
                    # If inactive for exactly 7 or 14 days, send a nudge
                    if days_diff in [7, 14]:
                        await notification_service.send_inactivity_nudge(user.id, user.full_name, days_diff)
                        logger.info(f"Sent inactivity nudge to {user.id} ({days_diff} days)")

                # --- CHECK 2: BUFFER EMERGENCY BRAKE ---
                # Check if safe-to-spend is below the required buffer
                sts_data = await analytics_service.calculate_safe_to_spend_amount(db, user.id)
                # If safe-to-spend is zero or negative, it means the buffer is exhausted
                if sts_data.safe_to_spend <= 0:
                    await notification_service.send_buffer_alert(user.id, user.full_name, float(sts_data.safe_to_spend))
                    logger.info(f"Sent buffer emergency brake to {user.id}")

                # --- CHECK 3: WEEKEND (FRIDAY) ---
                if today.weekday() == 4: # 4 is Friday
                    # Calculate safe-to-spend for this user
                    sts_data = await analytics_service.calculate_safe_to_spend_amount(db, user.id)
                    
                    # Fetch top category for the last 7 days for more insight
                    seven_days_ago = today - timedelta(days=7)
                    cat_stmt = (
                        select(Transaction.category, func.sum(func.abs(Transaction.amount)).label("total"))
                        .where(Transaction.user_id == user.id)
                        .where(Transaction.transaction_date >= seven_days_ago)
                        .where(Transaction.category.notin_(["Income", "Transfer"]))
                        .group_by(Transaction.category)
                        .order_by(func.sum(func.abs(Transaction.amount)).desc())
                        .limit(1)
                    )
                    cat_res = await db.execute(cat_stmt)
                    top_cat_row = cat_res.first()
                    top_category = top_cat_row.category if top_cat_row else None
                    
                    # Trigger the AI-driven weekend insight with more context
                    await notification_service.send_weekend_insight(
                        user_id=user.id, 
                        full_name=user.full_name, 
                        safe_to_spend=float(sts_data.safe_to_spend),
                        current_balance=float(sts_data.current_balance),
                        top_category=top_category
                    )
                    logger.info(f"Sent weekend insight to {user.id}")
                    
            except Exception as e:
                logger.error(f"Error in lifestyle insight for user {user.id}: {e}")
                
    logger.info("Lifestyle Insights Completed.")

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
        llm_service = get_llm_service()
        cat_service = CategoryService(db)
        wealth_service = WealthService(db)
        txn_service = TransactionService(db)
        notif_service = NotificationService(db, llm_service)
        sync_service = SyncService(db, txn_service, cat_service, wealth_service, notif_service, llm_service)
        
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
