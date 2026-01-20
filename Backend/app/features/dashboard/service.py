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

async def get_monthly_category_breakdown(db: AsyncSession, user_id: str, months: int = 4):
    """Return aggregated expenses by month and category for the last N months."""
    # Approximate days
    days = months * 30
    start_date = (datetime.now() - timedelta(days=days)).replace(day=1).date()
    
    # Extract year and month. For SQLite/Postgres compatibility, we might just fetch date 
    # and group in python, or use a universally supported truncate/extract.
    # But for now, let's fetch all transactions (filtered) and group in Python to be safe 
    # and allow for complex "Sub Category" logic if needed later.
    
    stmt = (
        select(
            Transaction.transaction_date,
            Transaction.category,
            Transaction.sub_category,
            Transaction.amount
        )
        .where(Transaction.user_id == user_id)
        .where(Transaction.category != "Income")
        .where(Transaction.transaction_date >= start_date)
        .order_by(Transaction.transaction_date)
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Process in Python
    # Structure: { "2023-10": { "Housing": 2000, "Food": 500, "Rent": 2000 } }
    # Note: collecting SubCategories for "Rent" visibility
    
    breakdown = {}
    
    for row in rows:
        if not row.transaction_date:
            continue
            
        month_key = row.transaction_date.strftime("%Y-%m") # YYYY-MM
        amount = abs(float(row.amount or 0))
        cat = row.category
        sub = row.sub_category
        
        if month_key not in breakdown:
            breakdown[month_key] = {}
            
        # Aggregate by Category
        breakdown[month_key][cat] = breakdown[month_key].get(cat, 0) + amount
        
        # ALSO explicitly capture likely Fixed Expenses as pseudo-categories for the LLM
        # This helps 'sanitized' data requirement by not sending every subcategory, 
        # but prominently featuring "Rent", "EMI", "Insurance"
        if sub and sub in ["Rent", "Maintenance", "EMI", "Insurance", "Education"]:
           breakdown[month_key][f"_{sub}"] = breakdown[month_key].get(f"_{sub}", 0) + amount

    # Convert to list for easier JSON serialization
    # [ { "month": "2023-10", "breakdown": {...} }, ... ]
    formatted = []
    for m in sorted(breakdown.keys()):
        formatted.append({
            "month": m,
            "categories": breakdown[m]
        })
        
    return formatted

