import logging
from datetime import date, timedelta
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.utils.finance_utils import get_billing_cycle_dates

logger = logging.getLogger(__name__)


async def check_upcoming_billing_cycles(
    db: AsyncSession,
    days_before: int = 3
) -> List[dict]:
    """
    Check all credit cards and identify those with upcoming statement dates.
    
    Args:
        db: Database session
        days_before: Number of days before statement to trigger notification
        
    Returns:
        List of credit cards with upcoming statements
    """
    from app.features.credit_cards.models import CreditCard
    
    stmt = select(CreditCard).where(CreditCard.is_active == True)
    result = await db.execute(stmt)
    cards = result.scalars().all()
    
    upcoming_notifications = []
    today = date.today()
    
    for card in cards:
        cycle_info = get_billing_cycle_dates(card.statement_date)
        days_until = cycle_info["days_until_statement"]
        
        if 0 <= days_until <= days_before:
            upcoming_notifications.append({
                "card_id": card.id,
                "card_name": card.card_name,
                "user_id": card.user_id,
                "statement_date": cycle_info["next_statement_date"],
                "days_until": days_until,
                "message": f"Your {card.card_name} billing cycle closes in {days_until} day(s)"
            })
    
    return upcoming_notifications


async def check_upcoming_bills(
    db: AsyncSession,
    days_before: int = 2
) -> List[dict]:
    """
    Check for unpaid bills approaching their due date.
    
    Args:
        db: Database session
        days_before: Number of days before due date to trigger notification
        
    Returns:
        List of bills with upcoming due dates
    """
    from app.features.bills.models import Bill
    
    today = date.today()
    threshold_date = today + timedelta(days=days_before)
    
    stmt = (
        select(Bill)
        .where(Bill.is_paid == False)
        .where(Bill.due_date <= threshold_date)
        .where(Bill.due_date >= today)
    )
    
    result = await db.execute(stmt)
    bills = result.scalars().all()
    
    upcoming_notifications = []
    
    for bill in bills:
        days_until = (bill.due_date - today).days
        upcoming_notifications.append({
            "bill_id": bill.id,
            "title": bill.title,
            "user_id": bill.user_id,
            "amount": bill.amount,
            "due_date": bill.due_date,
            "days_until": days_until,
            "message": f"Bill '{bill.title}' of ₹{bill.amount} is due in {days_until} day(s)"
        })
    
    return upcoming_notifications


async def get_notification_summary(
    db: AsyncSession,
    user_id: str,
    days_ahead: int = 7
) -> dict:
    """
    Get a summary of all upcoming financial obligations for a user.
    
    Args:
        db: Database session
        user_id: User ID to check
        days_ahead: Number of days to look ahead
        
    Returns:
        Summary of upcoming obligations
    """
    from app.features.credit_cards.models import CreditCard
    from app.features.bills.models import Bill
    
    today = date.today()
    threshold_date = today + timedelta(days=days_ahead)
    
    # Check credit cards
    cards_stmt = select(CreditCard).where(
        CreditCard.user_id == user_id,
        CreditCard.is_active == True
    )
    cards_result = await db.execute(cards_stmt)
    cards = cards_result.scalars().all()
    
    upcoming_cycles = []
    for card in cards:
        cycle_info = get_billing_cycle_dates(card.statement_date)
        if cycle_info["next_statement_date"] <= threshold_date:
            upcoming_cycles.append({
                "card_name": card.card_name,
                "statement_date": cycle_info["next_statement_date"],
                "days_until": cycle_info["days_until_statement"]
            })
    
    # Check bills
    bills_stmt = (
        select(Bill)
        .where(Bill.user_id == user_id)
        .where(Bill.is_paid == False)
        .where(Bill.due_date <= threshold_date)
        .where(Bill.due_date >= today)
    )
    bills_result = await db.execute(bills_stmt)
    bills = bills_result.scalars().all()
    
    upcoming_bills = [
        {
            "title": bill.title,
            "amount": bill.amount,
            "due_date": bill.due_date,
            "days_until": (bill.due_date - today).days
        }
        for bill in bills
    ]
    
    return {
        "upcoming_billing_cycles": upcoming_cycles,
        "upcoming_bills": upcoming_bills,
        "total_upcoming_obligations": len(upcoming_cycles) + len(upcoming_bills)
    }
