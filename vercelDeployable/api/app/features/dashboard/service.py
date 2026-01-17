from datetime import datetime, timedelta
from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from app.features.transactions.models import Transaction
from app.features.transactions.enums import Category

async def get_daily_expenses(db: AsyncSession, user_id: str, days: int = 90):
    """Return daily aggregated expenses for forecasting."""
    start_date = datetime.now() - timedelta(days=days)
    
    stmt = (
        select(
            cast(Transaction.created_at, Date).label("day"),
            func.sum(Transaction.amount).label("total")
        )
        .where(Transaction.user_id == user_id)
        .where(Transaction.category != Category.INCOME)
        .where(Transaction.created_at >= start_date)
        .group_by("day")
        .order_by("day")
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {"ds": row.day.isoformat(), "y": float(row.total)}
        for row in rows
    ]
