
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
    Check for payments due exactly 1 or 2 days from today and send notifications.
    Includes explicit Bills, Credit Cards, and Auto-detected Sureties.
    """
    logger.info("Starting Surety Reminders Scan (1 & 2 days prior)...")
    import zoneinfo
    from app.features.auth.models import User
    from app.features.bills.service import BillService
    from app.features.credit_cards.service import CreditCardService
    from app.features.notifications.service import NotificationService
    
    tz = zoneinfo.ZoneInfo(settings.APP_TIMEZONE)
    today = datetime.now(tz).date()
    target_dates = [today + timedelta(days=1), today + timedelta(days=2)]
    
    async with AsyncSessionLocal() as db:
        llm_service = get_llm_service()
        notification_service = NotificationService(db, llm_service)
        bill_service = BillService()
        cc_service = CreditCardService()
        
        # 1. Fetch all users
        stmt_users = select(User)
        res_users = await db.execute(stmt_users)
        users = res_users.scalars().all()
        
        for user in users:
            full_name = user.full_name or user.email.split('@')[0]
            
            # --- PART A: Credit Cards ---
            try:
                cards = await cc_service.get_user_cards(db, user.id, active_only=True)
                for card in cards:
                    # Calculate next payment due date in Asia/Kolkata
                    due_day = card.payment_due_date
                    try:
                        due_date = today.replace(day=due_day)
                    except ValueError:
                        from calendar import monthrange
                        last_day = monthrange(today.year, today.month)[1]
                        due_date = today.replace(day=last_day)
                        
                    if due_date < today:
                        # Move to next month
                        if today.month == 12:
                            next_month = date(today.year + 1, 1, 1)
                        else:
                            next_month = date(today.year, today.month + 1, 1)
                        try:
                            due_date = next_month.replace(day=due_day)
                        except ValueError:
                            from calendar import monthrange
                            last_day = monthrange(next_month.year, next_month.month)[1]
                            due_date = next_month.replace(day=last_day)
                            
                    if due_date in target_dates:
                        # Calculate unbilled amount
                        from app.utils.finance_utils import get_billing_cycle_dates
                        cycle_dates = get_billing_cycle_dates(card.statement_date)
                        unbilled = await cc_service.get_unbilled_amount(
                            db,
                            card.id,
                            cycle_dates["cycle_start"],
                            cycle_dates["cycle_end"]
                        )
                        if unbilled > 0:
                            await notification_service.send_surety_reminder(
                                user.id,
                                full_name,
                                f"{card.card_name} Payment",
                                float(unbilled),
                                datetime.combine(due_date, datetime.min.time())
                            )
                            logger.info(f"Sent credit card reminder for card: {card.card_name} to user {user.id}")
            except Exception as e:
                logger.error(f"Failed to check credit card reminders for user {user.id}: {e}")

            # --- PART B: Bills & Auto-detected Sureties ---
            try:
                ledger = await bill_service.get_obligations_ledger(db, user.id, days_ahead=60, include_hidden=False)
                for item in ledger["items"]:
                    if item.type in ["BILL", "SURETY_TXN"]:
                        if item.status in ["PROJECTED", "PENDING", "OVERDUE"]:
                            # We check if due date matches one of our target dates
                            if item.due_date in target_dates:
                                await notification_service.send_surety_reminder(
                                    user.id,
                                    full_name,
                                    item.title,
                                    float(item.amount),
                                    datetime.combine(item.due_date, datetime.min.time())
                                )
                                logger.info(f"Sent reminder for {item.type}: {item.title} to user {user.id}")
            except Exception as e:
                logger.error(f"Failed to check ledger reminders for user {user.id}: {e}")
                
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
        
        # 1. Find categories where spend > 1000 in last 7 days
        # Exclude 'Investment'
        seven_days_ago = datetime.now() - timedelta(days=7)
        
        stmt = (
            select(User.id, User.full_name, Transaction.category, func.sum(func.abs(Transaction.amount)).label("total"))
            .join(Transaction, User.id == Transaction.user_id)
            .where(Transaction.transaction_date >= seven_days_ago.date())
            .where(Transaction.category != 'Investment')
            .group_by(User.id, User.full_name, Transaction.category)
            .having(func.sum(func.abs(Transaction.amount)) > 1000)
        )
        
        result = await db.execute(stmt)
        data = result.all()
        logger.info(f"Weekly Insights: Found {len(data)} user/category pairs over ₹1,000 threshold.")
        
        # 2. Group by user for consolidated emails
        user_insights = {}
        for user_id, full_name, category, total in data:
            if user_id not in user_insights:
                user_insights[user_id] = {
                    "full_name": full_name,
                    "items": []
                }
            user_insights[user_id]["items"].append({
                "category": category,
                "amount": float(total)
            })
            
        # 3. Send consolidated emails
        for user_id, info in user_insights.items():
            try:
                await notification_service.send_weekly_summary(
                    user_id, 
                    info["full_name"], 
                    info["items"]
                )
                logger.info(f"Sent consolidated weekly recap to user {user_id} ({len(info['items'])} categories)")
            except Exception as e:
                logger.error(f"Failed to send weekly recap for user {user_id}: {e}")

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
        from app.features.notifications.service import NotificationService
        
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

async def run_inactivity_contingency_check():
    """
    Check for users who haven't accessed the app for INACTIVITY_THRESHOLD_DAYS (e.g. 7 days)
    and have a designated emergency/backup contact email.
    Generates and emails the comprehensive portfolio statement Excel (.xlsx) schedule.
    """
    logger.info("Starting Inactivity Contingency Check...")
    from app.features.auth.models import User
    from app.features.export.service import generate_portfolio_statement_excel
    from app.core.email import send_email
    import zoneinfo
    from datetime import datetime, timezone, timedelta
    
    threshold_days = settings.INACTIVITY_THRESHOLD_DAYS
    tz = zoneinfo.ZoneInfo(settings.APP_TIMEZONE)
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=threshold_days)
    
    async with AsyncSessionLocal() as db:
        stmt = select(User).where(
            User.is_active == True,
            User.emergency_contact_email.isnot(None),
            (
                (User.last_active_at.isnot(None) & (User.last_active_at < cutoff)) |
                (User.last_active_at.is_(None) & (User.created_at < cutoff))
            )
        )
        res = await db.execute(stmt)
        users = res.scalars().all()
        
        logger.info(f"Inactivity check: Found {len(users)} users inactive for >{threshold_days} days with emergency contact.")
        
        import re
        for user in users:
            try:
                raw_emails = user.emergency_contact_email or ""
                dest_emails = [e.strip() for e in re.split(r'[,;\n\r]+', raw_emails) if e.strip() and "@" in e]
                if not dest_emails:
                    continue
                
                logger.info(f"Generating portfolio statement XLS for inactive user {user.email} -> {dest_emails}")
                excel_stream = await generate_portfolio_statement_excel(db, user)
                excel_bytes = excel_stream.getvalue()
                
                user_name = user.full_name or user.email.split('@')[0].replace('.', ' ').title()
                today_str = datetime.now(tz).strftime("%Y-%m-%d")
                clean_email_prefix = user.email.split('@')[0]
                filename = f"Grip_Asset_Schedule_{clean_email_prefix}_{today_str}.xlsx"
                
                subject = f"Confidential Asset Portfolio Statement for {user_name} [Grip Contingency]"
                html_body = f"""
                <html>
                    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 24px; background-color: #f8fafc;">
                        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                            <div style="background: #090a0f; padding: 32px; color: #ffffff;">
                                <span style="font-size: 22px; font-weight: 900; letter-spacing: -0.02em; color: #ffffff;">GRIP</span>
                                <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-left: 12px;">Asset Contingency</span>
                                <h2 style="color: #ffffff; margin: 20px 0 0 0; font-size: 20px; font-weight: 800;">Secure Financial Asset Schedule</h2>
                            </div>
                            <div style="padding: 32px;">
                                <p style="font-size: 15px; color: #334155; margin-top: 0;">
                                    Hello,
                                </p>
                                <p style="font-size: 14px; color: #475569;">
                                    You are listed as the designated backup / emergency contact for <strong>{user_name}</strong> ({user.email}) on <strong>Grip</strong>.
                                </p>
                                <div style="background: #f1f5f9; padding: 20px; border-radius: 14px; margin: 24px 0; border: 1px solid #e2e8f0;">
                                    <p style="margin: 0; font-size: 13px; color: #334155; font-weight: 600;">
                                        Contingency Notice:
                                    </p>
                                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #64748b;">
                                        {user_name} has not accessed Grip in the last {threshold_days} days. As per their contingency preference, an updated, confidential portfolio & asset statement spreadsheet has been generated and attached to this email.
                                    </p>
                                </div>
                                <p style="font-size: 13px; color: #475569;">
                                    The attached Excel spreadsheet (<strong>{filename}</strong>) contains the consolidated financial asset schedule, including accounts, holdings, and liabilities recorded in Grip.
                                </p>
                                <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 30px;">
                                    This automated message was sent securely by Grip Automated Systems as instructed by {user_name}.
                                </p>
                            </div>
                        </div>
                    </body>
                </html>
                """
                
                for dest_email in dest_emails:
                    try:
                        send_email(
                            to_email=dest_email,
                            subject=subject,
                            html_content=html_body,
                            attachment_bytes=excel_bytes,
                            attachment_filename=filename,
                            attachment_mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        )
                        logger.info(f"Contingency asset email sent to {dest_email} for user {user.email}")
                    except Exception as send_err:
                        logger.error(f"Failed to send contingency email to {dest_email}: {send_err}")
            except Exception as e:
                logger.error(f"Failed to process inactivity contingency for user {user.email}: {e}", exc_info=True)


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
    
    # Run Surety reminders daily at 7:00 AM IST (1:30 AM UTC)
    reminder_trigger = CronTrigger(hour=1, minute=30)
    scheduler.add_job(run_surety_reminders, reminder_trigger)
    
    # Run Weekly Insights on Sunday at 10:00 AM IST (4:30 AM UTC)
    insight_trigger = CronTrigger(day_of_week='sun', hour=4, minute=30)
    scheduler.add_job(run_weekly_insights, insight_trigger)

    # Run Inactivity Contingency Check daily at 8:00 AM IST (2:30 AM UTC)
    inactivity_trigger = CronTrigger(hour=2, minute=30)
    scheduler.add_job(run_inactivity_contingency_check, inactivity_trigger)
    
    scheduler.start()
    logger.info("Scheduler started. Jobs scheduled.")
