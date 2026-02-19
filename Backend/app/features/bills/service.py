import logging
import asyncio
from uuid import UUID
from datetime import date, datetime, timedelta
import zoneinfo
from decimal import Decimal
from typing import List, Optional, Set, Tuple
from calendar import monthrange
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.core.config import get_settings
from app.features.bills.models import Bill, BillExclusion
from app.features.bills.schemas import BillCreate, BillUpdate, SuretyExclusionCreate

settings = get_settings()
logger = logging.getLogger(__name__)

from app.features.categories.models import SubCategory
from app.features.transactions.models import Transaction

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

    async def create_surety_exclusion(
        self,
        db: AsyncSession,
        user_id: UUID,
        data: SuretyExclusionCreate
    ) -> BillExclusion:
        """Create an exclusion rule for auto-detected sureties."""
        excl = BillExclusion(
            user_id=user_id,
            source_transaction_id=data.source_transaction_id,
            merchant_pattern=data.merchant_pattern,
            subcategory_pattern=data.subcategory_pattern,
            exclusion_type=data.exclusion_type
        )
        db.add(excl)
        await db.commit()
        await db.refresh(excl)
        logger.info(f"Created exclusion rule type {data.exclusion_type} for user {user_id}")
        return excl
    
    async def get_obligations_ledger(
        self,
        db: AsyncSession,
        user_id: UUID,
        days_ahead: int = 30,
        include_hidden: bool = False
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
        from app.features.categories.models import SubCategory
        from app.utils.finance_utils import get_month_date_range, get_previous_month_date_range
        
        today = self._get_today()
        threshold_date = today + timedelta(days=days_ahead)
        
        ledger_items = []
        unpaid_total = Decimal("0.00")
        projected_total = Decimal("0.00")
        
        # Define Statements
        excl_stmt = select(BillExclusion).where(BillExclusion.user_id == user_id)
        bill_stmt = select(Bill).where(Bill.user_id == user_id, Bill.is_paid == False)
        rec_stmt = select(Bill).where(Bill.user_id == user_id, Bill.is_recurring == True)
        sub_stmt = select(SubCategory.name).where(SubCategory.is_surety == True)
        
        prev_range = get_previous_month_date_range(today)
        curr_range = get_month_date_range(today)
        
        past_stmt = (
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .where(Transaction.transaction_date >= prev_range["month_start"])
            .where(Transaction.transaction_date <= prev_range["month_end"])
        )
        
        curr_stmt = (
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .where(Transaction.transaction_date >= curr_range["month_start"])
            .where(Transaction.transaction_date <= curr_range["month_end"])
        )

        # Execute all in parallel
        excl_res, bill_res, rec_res, sub_res, past_res, curr_res = await asyncio.gather(
            db.execute(excl_stmt),
            db.execute(bill_stmt),
            db.execute(rec_stmt),
            db.execute(sub_stmt),
            db.execute(past_stmt),
            db.execute(curr_stmt)
        )
        
        exclusions = excl_res.scalars().all()
        unpaid_bills = bill_res.scalars().all()
        recurring_bills = rec_res.scalars().all()
        surety_subs = set(name.lower() for name in sub_res.scalars().all())
        all_past_txns = list(past_res.scalars().all())
        all_curr_txns = list(curr_res.scalars().all())

        skipped_source_ids = {e.source_transaction_id for e in exclusions if e.exclusion_type == 'SKIP' and e.source_transaction_id}
        manual_paid_ids = {e.source_transaction_id for e in exclusions if e.exclusion_type == 'MANUAL_PAID' and e.source_transaction_id}
        permanent_patterns = [
            (e.merchant_pattern.lower() if e.merchant_pattern else None, 
             e.subcategory_pattern.lower() if e.subcategory_pattern else None)
            for e in exclusions if e.exclusion_type == 'PERMANENT'
        ]

        covered_signatures: Set[Tuple[str, Decimal]] = set()
        
        # 1. Process unpaid bills
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
                sub_category=bill.sub_category,
                source_id=None
            ))
            unpaid_total += bill.amount
            if bill.is_recurring:
                covered_signatures.add((bill.sub_category.lower(), bill.amount))

        # 2. Project NEXT instances for Recurring Bills
        for bill in recurring_bills:
            r_day = bill.recurrence_day or bill.due_date.day
            next_due = self._calculate_next_recurrence(r_day, today)
            if today <= next_due <= threshold_date:
                if next_due > bill.due_date or bill.is_paid:
                    ledger_items.append(IdentifiedObligation(
                        id=f"proj-{bill.id}",
                        title=f"{bill.title} (Projected)",
                        amount=bill.amount,
                        due_date=next_due,
                        type="BILL",
                        status="PROJECTED",
                        category=bill.category,
                        sub_category=bill.sub_category,
                        source_id=None
                    ))
                    projected_total += bill.amount
                    covered_signatures.add((bill.sub_category.lower(), bill.amount))

        # 3. Process Surety
        past_txns = [t for t in all_past_txns if t.is_surety or (t.sub_category and t.sub_category.lower() in surety_subs)]
        curr_txns = [t for t in all_curr_txns if t.is_surety or (t.sub_category and t.sub_category.lower() in surety_subs)]
        
        matched_curr_ids = set()
        
        for p_txn in past_txns:
            # Prepare status
            is_excluded = False
            exclusion_reason = ""
            
            # Check Skip Exclusion
            if p_txn.id in skipped_source_ids:
                is_excluded = True
                exclusion_reason = "SKIPPED"

            # Check Manual Paid
            if str(p_txn.id) in {str(id) for id in manual_paid_ids}:
                is_excluded = True
                exclusion_reason = "PAID"
            
            # Check Permanent Exclusion
            # Check Permanent Exclusion
            if not is_excluded:
                p_m = (p_txn.merchant_name or "").lower()
                p_s = (p_txn.sub_category or "").lower()
                for emp, esp in permanent_patterns:
                    match_m = (emp == p_m) if emp is not None else True
                    match_s = (esp == p_s) if esp is not None else True
                    if match_m and match_s:
                        is_excluded = True
                        exclusion_reason = "TERMINATED"
                        break
            
            # Check Covered by Bill
            # Relaxed check: subcategory AND amount
            if not is_excluded:
                # Need to handle Decimal comparison carefully? set handles it.
                if (p_txn.sub_category.lower(), p_txn.amount) in covered_signatures:
                    is_excluded = True
                    exclusion_reason = "COVERED"
            
            # estimated due date
            due_day = p_txn.transaction_date.day
            try:
                p_date = today.replace(day=min(due_day, curr_range["month_end"].day))
            except:
                p_date = today

            # Find partner in current month (regardless of exclusion, to determine projected vs done?)
            # Actually if it's already done (partner found), we don't project anyway.
            partner_found = False
            for c_txn in curr_txns:
                if c_txn.id not in matched_curr_ids:
                    if abs(p_txn.amount) == abs(c_txn.amount):
                        p_m = (p_txn.merchant_name or "").lower()
                        c_m = (c_txn.merchant_name or "").lower()
                        
                        match_merch = (p_m == c_m)
                        # Relaxed match: SubCategory match is sufficient if amount is exact
                        match_sub = (p_txn.sub_category.lower() == c_txn.sub_category.lower())
                        
                        # Even more relaxed: If one merchant contains the other (e.g. "Google" vs "Google Services")
                        match_fuzzy = (p_m and c_m) and (p_m in c_m or c_m in p_m)
                        
                        if match_merch or match_sub or match_fuzzy:
                            matched_curr_ids.add(c_txn.id)
                            partner_found = True
                            break
            
            if partner_found:
                if include_hidden:
                     ledger_items.append(IdentifiedObligation(
                        id=f"auto-{p_txn.id}",
                        title=f"{p_txn.merchant_name or p_txn.sub_category} (Auto-detected)",
                        amount=abs(p_txn.amount),
                        due_date=p_date, # Use estimated date
                        type="SURETY_TXN",
                        status="PAID",
                        sub_category=p_txn.sub_category,
                        source_id=str(p_txn.id)
                    ))
                continue # Already paid this month, no obligation


            # Does it pass filter?
            if is_excluded and not include_hidden:
                continue
                

            
            date_status = "PROJECTED"
            if p_date < today:
                date_status = "OVERDUE"
            
            final_status = date_status
            if is_excluded:
                final_status = exclusion_reason
            
            # Date filter only applies if active (PROJECTED/OVERDUE)
            # If excluded, we include it regardless of date if include_hidden is True?
            # Or still respect threshold? Let's respect threshold for "Upcoming" logic, but maybe relax for "Management"?
            # Let's keep threshold strict for now.
            if today <= p_date <= threshold_date or final_status in ["OVERDUE", "SKIPPED", "TERMINATED", "COVERED", "PAID"]:
                 if include_hidden or not is_excluded:
                    ledger_items.append(IdentifiedObligation(
                        id=f"auto-{p_txn.id}",
                        title=f"{p_txn.merchant_name or p_txn.sub_category} (Auto-detected)",
                        amount=abs(p_txn.amount),
                        due_date=p_date,
                        type="SURETY_TXN",
                        status=final_status,
                        sub_category=p_txn.sub_category,
                        source_id=str(p_txn.id)
                    ))
                    if final_status == "PROJECTED":
                        projected_total += abs(p_txn.amount)
                    elif final_status == "OVERDUE":
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
