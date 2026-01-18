from datetime import datetime, timedelta
from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from app.features.transactions.models import Transaction

async def get_daily_expenses(db: AsyncSession, user_id: str, days: int = 90):
    """Return daily aggregated expenses for forecasting."""
    # Ensure start_date is a date object for comparison with transaction_date
    start_date = (datetime.now() - timedelta(days=days)).date()
    
    stmt = (
        select(
            Transaction.transaction_date.label("day"),
            func.sum(Transaction.amount).label("total")
        )
        .where(Transaction.user_id == user_id)
        .where(Transaction.category != "Income")
        .where(Transaction.transaction_date >= start_date)
        .group_by("day")
        .order_by("day")
    )
    
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Return absolute values because expenses are stored as negative, 
    # but forecasting expects positive magnitude of spend.
    return [
        {"ds": row.day.isoformat(), "y": abs(float(row.total or 0))}
        for row in rows
        if row.day is not None # Filter out any missing dates if they exist
    ]

async def get_category_expenses_history(db: AsyncSession, user_id: str, days: int = 90):
    """Return aggregated expenses by category for the last N days."""
    start_date = (datetime.now() - timedelta(days=days)).date()
    
    stmt = (
        select(
            Transaction.category,
            func.sum(Transaction.amount).label("total")
        )
        .where(Transaction.user_id == user_id)
        .where(Transaction.category != "Income")
        .where(Transaction.transaction_date >= start_date)
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).asc()) # Expenses are negative, so ASC puts biggest spenders first
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {"category": row.category, "total": abs(float(row.total or 0))}
        for row in rows
    ]

async def get_discretionary_daily_expenses(db: AsyncSession, user_id: str, days: int = 30):
    """Return daily discretionary expenses (excluding Investment, Housing, Bills, Transfers, Surety)."""
    start_date = (datetime.now() - timedelta(days=days)).date()
    
    stmt = (
        select(
            Transaction.transaction_date.label("day"),
            func.sum(Transaction.amount).label("total")
        )
        .where(Transaction.user_id == user_id)
        .where(Transaction.category.notin_(["Income", "Investment", "Housing", "Bill Payment", "Transfer"]))
        .where(Transaction.is_surety == False)
        .where(Transaction.transaction_date >= start_date)
        .group_by("day")
        .order_by("day")
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {"ds": row.day.isoformat(), "y": abs(float(row.total or 0))}
        for row in rows
        if row.day is not None
    ]

