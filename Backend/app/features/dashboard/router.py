from typing import Annotated, Dict, Optional
import asyncio
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from app.core.database import get_db
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.transactions.models import Transaction

from app.features.dashboard.service import get_daily_expenses, get_category_expenses_history, get_monthly_category_breakdown
from app.features.forecasting.service import ForecastingService

router = APIRouter()

@router.get("/liquidity")
async def get_liquidity_dashboard(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    balance_stmt = (
        select(func.sum(Transaction.amount))
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.account_type.in_(["CASH", "SAVINGS"]))
    )
    
    cc_stmt = (
        select(func.sum(Transaction.amount))
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.category != "Income")
        .where(Transaction.account_type == "CREDIT_CARD")
    )
    
    bills_stmt = (
        select(func.sum(Transaction.amount))
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.sub_category.in_(["Rent", "Maintenance", "Credit Card Payment"]))
    )

    balance_res = await db.execute(balance_stmt)
    cc_res = await db.execute(cc_stmt)
    bills_res = await db.execute(bills_stmt)

    balance = balance_res.scalar() or 0
    unbilled_cc = cc_res.scalar() or 0
    bills = bills_res.scalar() or 0
    
    # Liquidity is the sum of liquid balance + CC debt (which is negative)
    # If balance is 10,000 and CC debt is -2,000, liquidity is 8,000.
    return {
        "liquidity": balance + unbilled_cc,
        "breakdown": {
            "balance": balance,
            "unbilled_cc": abs(unbilled_cc),
            "bills": abs(bills)
        }
    }

@router.get("/investments")
async def get_investments_dashboard(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=2100)
):
    from datetime import date
    from app.utils.finance_utils import get_month_date_range

    # Aggregate by SubCategory for Investment Category
    stmt = (
        select(Transaction.sub_category, func.sum(Transaction.amount))
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.category == "Investment")
    )

    if month and year:
        target_date = date(year, month, 1)
        rng = get_month_date_range(target_date)
        stmt = stmt.where(Transaction.transaction_date >= rng["month_start"])
        stmt = stmt.where(Transaction.transaction_date <= rng["month_end"])

    stmt = stmt.group_by(Transaction.sub_category)
    result = await db.execute(stmt)
    breakdown = {str(row[0]): abs(row[1]) for row in result.all()}
    
    total = abs(sum(breakdown.values()))
    
    return {
        "total_investments": total,
        "breakdown": breakdown
    }

@router.get("/forecast")
async def get_financial_forecast(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[ForecastingService, Depends()]
):
    # Execute data gathering in parallel
    history_task = get_daily_expenses(db, current_user.id, days=120)
    category_history_task = get_category_expenses_history(db, current_user.id, days=120)
    monthly_breakdown_task = get_monthly_category_breakdown(db, current_user.id, months=4)
    
    history, category_history, monthly_breakdown = await asyncio.gather(
        history_task,
        category_history_task,
        monthly_breakdown_task
    )
    
    forecast = await service.calculate_safe_to_spend(history, category_history, monthly_breakdown)
    
    return {
        "predicted_burden_30d": forecast.amount,
        "confidence": forecast.confidence,
        "description": forecast.reason,
        "time_frame": forecast.time_frame,
        "breakdown": forecast.breakdown
    }
