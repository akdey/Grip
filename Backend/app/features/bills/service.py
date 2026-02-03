import logging
from uuid import UUID
from datetime import date, datetime, timedelta
import zoneinfo
from decimal import Decimal
from typing import List, Optional
from calendar import monthrange
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.config import get_settings
from app.features.bills.models import Bill
from app.features.bills.schemas import BillCreate, BillUpdate

settings = get_settings()
# Constants
import logging
logger = logging.getLogger(__name__)

from app.features.categories.models import SubCategory


class BillService:
    def __init__(self):
        self._tz = zoneinfo.ZoneInfo(settings.APP_TIMEZONE)

    def _get_today(self) -> date:
        """Get current date in the configured timezone."""
        return datetime.now(self._tz).date()
    
    async def create_bill(
        self,
        db: AsyncSession,
        user_id: UUID,
        bill_data: BillCreate
    ) -> Bill:
        """Create a new bill."""
        data = bill_data.model_dump()
        # Default recurrence_day to due_date day if it's recurring but day not specified
        if data.get("is_recurring") and not data.get("recurrence_day"):
            data["recurrence_day"] = data["due_date"].day
            
        bill = Bill(
            user_id=user_id,
            **data
        )
        db.add(bill)
        await db.commit()
        await db.refresh(bill)
        logger.info(f"Created bill '{bill.title}' for user {user_id}")
        return bill
    
    async def get_user_bills(
        self,
        db: AsyncSession,
        user_id: UUID,
        paid_filter: Optional[bool] = None
    ) -> List[Bill]:
        """Get all bills for a user with optional paid/unpaid filter."""
        stmt = select(Bill).where(Bill.user_id == user_id)
        
        if paid_filter is not None:
            stmt = stmt.where(Bill.is_paid == paid_filter)
        
        stmt = stmt.order_by(Bill.due_date)
        
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    async def get_bill_by_id(
        self,
        db: AsyncSession,
        bill_id: UUID,
        user_id: UUID
    ) -> Optional[Bill]:
        """Get a specific bill by ID."""
        stmt = select(Bill).where(
            Bill.id == bill_id,
            Bill.user_id == user_id
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def update_bill(
        self,
        db: AsyncSession,
        bill_id: UUID,
        user_id: UUID,
        bill_data: BillUpdate
    ) -> Optional[Bill]:
        """Update a bill."""
        bill = await self.get_bill_by_id(db, bill_id, user_id)
        
        if not bill:
            return None
        
        update_data = bill_data.model_dump(exclude_unset=True)
        # If toggling recurring on but no recurrence_day, default from existing or new due_date
        if update_data.get("is_recurring") and not update_data.get("recurrence_day") and not bill.recurrence_day:
            due_date = update_data.get("due_date") or bill.due_date
            update_data["recurrence_day"] = due_date.day

        for field, value in update_data.items():
            setattr(bill, field, value)
        
        await db.commit()
        await db.refresh(bill)
        logger.info(f"Updated bill {bill_id}")
        return bill
    
    async def mark_paid(
        self,
        db: AsyncSession,
        bill_id: UUID,
        user_id: UUID,
        paid: bool = True
    ) -> Optional[Bill]:
        """Mark a bill as paid or unpaid. For recurring bills, advances the due date."""
        bill = await self.get_bill_by_id(db, bill_id, user_id)
        
        if not bill:
            return None
        
        if paid and bill.is_recurring:
            # Advance due date to next month
            today = self._get_today()
            r_day = bill.recurrence_day or bill.due_date.day
            next_due = self._calculate_next_recurrence(r_day, today)
            
            # If next_due is same as current due_date (e.g. paying today's bill), 
            # we must ensure we move to the month AFTER.
            if next_due <= bill.due_date:
                # Force next month
                next_month = bill.due_date + timedelta(days=32)
                next_due = self._calculate_next_recurrence(r_day, next_month)
            
            bill.due_date = next_due
            bill.is_paid = False # Reset for next cycle
            logger.info(f"Advanced recurring bill {bill_id} to {next_due}")
        else:
            bill.is_paid = paid
            
        await db.commit()
        await db.refresh(bill)
        logger.info(f"Marked bill {bill_id} status updated (paid={paid})")
        return bill
    
    async def get_upcoming_bills(
        self,
        db: AsyncSession,
        user_id: UUID,
        days_ahead: int = 30
    ) -> List[Bill]:
        """Get unpaid bills due within the next X days."""
        today = self._get_today()
        threshold_date = today + timedelta(days=days_ahead)
        
        stmt = (
            select(Bill)
            .where(Bill.user_id == user_id)
            .where(Bill.is_paid == False)
            .where(Bill.due_date <= threshold_date)
            .order_by(Bill.due_date)
        )
        
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    async def get_obligations_ledger(
        self,
        db: AsyncSession,
        user_id: UUID,
        days_ahead: int = 30
    ) -> dict:
        """
        Get a full ledger of all identified obligations.
        Returns: {
            "unpaid_total": Decimal,
            "projected_total": Decimal,
            "items": List[IdentifiedObligation]
        }
        """
        from app.features.analytics.schemas import IdentifiedObligation
        from app.features.transactions.models import Transaction
        from sqlalchemy import or_
        
        today = self._get_today()
        threshold_date = today + timedelta(days=days_ahead)
        
        ledger_items = []
        unpaid_total = Decimal("0.00")
        projected_total = Decimal("0.00")
        
        # 1. Fetch ALL unpaid bills (one-time or recurring)
        # Note: For recurring, if it's unpaid, it usually means current instance is overdue or due soon.
        bill_stmt = select(Bill).where(Bill.user_id == user_id, Bill.is_paid == False)
        bill_res = await db.execute(bill_stmt)
        unpaid_bills = bill_res.scalars().all()
        
        covered_subcategories = set()
        
        for bill in unpaid_bills:
            status = "OVERDUE" if bill.due_date < today else "PENDING"
            ledger_items.append(IdentifiedObligation(
                id=str(bill.id),
                title=bill.title,
                amount=bill.amount,
                due_date=bill.due_date,
                type="BILL",
                status=status,
                category=bill.category,
                sub_category=bill.sub_category
            ))
            unpaid_total += bill.amount
            if bill.is_recurring:
                covered_subcategories.add(bill.sub_category.lower())

        # 2. Project NEXT instances for Recurring Bills
        rec_stmt = select(Bill).where(Bill.user_id == user_id, Bill.is_recurring == True)
        rec_res = await db.execute(rec_stmt)
        recurring_bills = rec_res.scalars().all()
        
        for bill in recurring_bills:
            r_day = bill.recurrence_day or bill.due_date.day
            next_due = self._calculate_next_recurrence(r_day, today)
            
            # If the next instance is in the FUTURE (not the current unpaid one)
            if today <= next_due <= threshold_date:
                # Avoid double counting if the bill is already in ledger as PENDING (unpaid)
                # But typically next_due will be > bill.due_date if bill is for this month.
                if next_due > bill.due_date or bill.is_paid:
                    ledger_items.append(IdentifiedObligation(
                        id=f"proj-{bill.id}",
                        title=f"{bill.title} (Projected)",
                        amount=bill.amount,
                        due_date=next_due,
                        type="BILL",
                        status="PROJECTED",
                        category=bill.category,
            sub_category=bill.sub_category
                    ))
                    projected_total += bill.amount
                    covered_subcategories.add(bill.sub_category.lower())

        # 3. Simple Surety Projections (Last Month vs Current Month)
        # We look at exactly what you did last month and check if you've done it yet this month.
        from app.utils.finance_utils import get_month_date_range, get_previous_month_date_range
        
        prev_range = get_previous_month_date_range(today)
        curr_range = get_month_date_range(today)
        
        # Get all surety transactions from last month (the "templates")
        past_stmt = (
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .where(Transaction.transaction_date >= prev_range["month_start"])
            .where(Transaction.transaction_date <= prev_range["month_end"])
            .where(or_(
                Transaction.is_surety == True,
                func.lower(Transaction.sub_category).in_(list(surety_subs))
            ))
        )
        
        # Get all surety transactions from the current month (to check against)
        curr_stmt = (
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .where(Transaction.transaction_date >= curr_range["month_start"])
            .where(Transaction.transaction_date <= curr_range["month_end"])
            .where(or_(
                Transaction.is_surety == True,
                func.lower(Transaction.sub_category).in_(list(surety_subs))
            ))
        )
        
        past_res = await db.execute(past_stmt)
        curr_res = await db.execute(curr_stmt)
        
        past_txns = list(past_res.scalars().all())
        curr_txns = list(curr_res.scalars().all())
        
        # Greedy matching to handle multiple identical SIPs
        matched_curr_ids = set()
        
        for p_txn in past_txns:
            # Skip if this sub-category is already handled by a formal Bill object
            if (p_txn.sub_category or "").lower() in covered_subcategories:
                continue
                
            # Try to find a partner in the current month by Merchant and Amount
            partner_found = False
            for c_txn in curr_txns:
                if c_txn.id not in matched_curr_ids:
                    # Simple match: same merchant and same absolute amount
                    if (p_txn.merchant_name == c_txn.merchant_name) and (abs(p_txn.amount) == abs(c_txn.amount)):
                        matched_curr_ids.add(c_txn.id)
                        partner_found = True
                        break
            
            if not partner_found:
                # Project the missing payment based on last month's date
                due_day = p_txn.transaction_date.day
                # Estimate due date for this month
                try:
                    p_date = today.replace(day=min(due_day, curr_range["month_end"].day))
                except:
                    p_date = today
                
                # If the projected date falls within our viewing window
                if today <= p_date <= threshold_date:
                    ledger_items.append(IdentifiedObligation(
                        id=f"auto-{p_txn.id}",
                        title=f"{p_txn.merchant_name or p_txn.sub_category} (Auto-detected)",
                        amount=abs(p_txn.amount),
                        due_date=p_date,
                        type="SURETY_TXN",
                        status="PROJECTED",
                        sub_category=p_txn.sub_category
                    ))
                    projected_total += abs(p_txn.amount)
                elif p_date < today:
                    # Overdue but not yet seen in current month
                    ledger_items.append(IdentifiedObligation(
                        id=f"auto-{p_txn.id}",
                        title=f"{p_txn.merchant_name or p_txn.sub_category} (Auto-detected)",
                        amount=abs(p_txn.amount),
                        due_date=p_date,
                        type="SURETY_TXN",
                        status="OVERDUE",
                        sub_category=p_txn.sub_category
                    ))
                    unpaid_total += abs(p_txn.amount)
        
        return {
            "unpaid_total": unpaid_total,
            "projected_total": projected_total,
            "items": ledger_items
        }
    async def get_projected_surety_bills(
        self,
        db: AsyncSession,
        user_id: UUID,
        days_ahead: int = 30
    ) -> Decimal:
        """Legay wrapper for projection total."""
        res = await self.get_obligations_ledger(db, user_id, days_ahead)
        return res["projected_total"]

    async def get_unpaid_bills_total(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> Decimal:
        """Legacy wrapper for unpaid total."""
        res = await self.get_obligations_ledger(db, user_id)
        return res["unpaid_total"]

    
    def _calculate_next_recurrence(
        self,
        recurrence_day: int,
        reference_date: date
    ) -> date:
        """Calculate the next occurrence date for a recurring bill."""
        # Try current month first
        try:
            next_date = date(
                reference_date.year,
                reference_date.month,
                min(recurrence_day, monthrange(reference_date.year, reference_date.month)[1])
            )
            
            if next_date >= reference_date:
                return next_date
        except ValueError:
            pass
        
        # Move to next month
        if reference_date.month == 12:
            next_month = 1
            next_year = reference_date.year + 1
        else:
            next_month = reference_date.month + 1
            next_year = reference_date.year
        
        return date(
            next_year,
            next_month,
            min(recurrence_day, monthrange(next_year, next_month)[1])
        )
