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
        bill = Bill(
            user_id=user_id,
            **bill_data.model_dump()
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
        """Mark a bill as paid or unpaid."""
        bill = await self.get_bill_by_id(db, bill_id, user_id)
        
        if not bill:
            return None
        
        bill.is_paid = paid
        await db.commit()
        await db.refresh(bill)
        logger.info(f"Marked bill {bill_id} as {'paid' if paid else 'unpaid'}")
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
            .where(Bill.due_date >= today)
            .where(Bill.due_date <= threshold_date)
            .order_by(Bill.due_date)
        )
        
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    async def get_unpaid_bills_total(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> Decimal:
        """Get total amount of all unpaid bills."""
        stmt = (
            select(func.sum(Bill.amount))
            .where(Bill.user_id == user_id)
            .where(Bill.is_paid == False)
        )
        
        result = await db.execute(stmt)
        total = result.scalar()
        return total or Decimal("0.00")
    
    async def get_projected_surety_bills(
        self,
        db: AsyncSession,
        user_id: UUID,
        days_ahead: int = 30
    ) -> Decimal:
        """
        Calculate projected surety bills (recurring predictable bills).
        This uses the 'is_surety' flag from the SubCategory table.
        """
        today = self._get_today()
        threshold_date = today + timedelta(days=days_ahead)
        
        # Get all recurring bills
        # We need to filter by those which are linked to a Surety SubCategory
        # Since Bill stores sub_category as String name (legacy design), we might need to join or subquery.
        # But we don't have a direct FK for sub_category. 
        # So we fetch all recurring bills, and then filtering Python or use a subquery on name.
        
        # Let's fetch all recurring bills first
        stmt = (
            select(Bill)
            .where(Bill.user_id == user_id)
            .where(Bill.is_recurring == True)
        )
        result = await db.execute(stmt)
        recurring_bills = result.scalars().all()
        
        # Get list of surety sub-category names
        sub_stmt = select(SubCategory.name).where(SubCategory.is_surety == True)
        sub_res = await db.execute(sub_stmt)
        surety_subs = set(sub_res.scalars().all())
        
        projected_total = Decimal("0.00")
        
        for bill in recurring_bills:
            # Check if this bill's sub-category is in our surety list
            if bill.sub_category not in surety_subs:
                continue
            
            # Calculate next occurrence
            if bill.recurrence_day:
                next_due = self._calculate_next_recurrence(
                    bill.recurrence_day,
                    today
                )
                
                if next_due <= threshold_date and not bill.is_paid:
                    projected_total += bill.amount
        
        return projected_total
    
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
