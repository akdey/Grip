from typing import Annotated, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from app.core.database import get_db
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.transactions.models import Transaction
from app.features.dashboard.service import get_daily_expenses
from app.features.forecasting.service import ForecastingService

router = APIRouter()

@router.get("/liquidity")
async def get_liquidity_dashboard(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    p2p_res = await db.execute(
        select(func.sum(Transaction.amount))
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.category == "Income")
        .where(Transaction.sub_category == "P2P Receive")
    )
    p2p_in = p2p_res.scalar() or 0
    
    income_res = await db.execute(
        select(func.sum(Transaction.amount))
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.category == "Income")
    )
    total_income = income_res.scalar() or 0
    
    expense_res = await db.execute(
        select(func.sum(Transaction.amount))
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.category.not_in(["Income", "Investment"]))
        .where(Transaction.account_type.in_(["CASH", "SAVINGS"]))
    )
    non_cc_expenses = expense_res.scalar() or 0
    
    balance = total_income - non_cc_expenses
    
    cc_res = await db.execute(
        select(func.sum(Transaction.amount))
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.category != "Income")
        .where(Transaction.account_type == "CREDIT_CARD")
    )
    unbilled_cc = cc_res.scalar() or 0
    
    bills_res = await db.execute(
        select(func.sum(Transaction.amount))
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.sub_category.in_(["Rent", "Maintenance", "Credit Card Payment"]))
    )
    bills = bills_res.scalar() or 0
    
    return {
        "liquidity": (balance + p2p_in) - (unbilled_cc + bills),
        "breakdown": {
            "balance": balance,
            "p2p_in": p2p_in,
            "unbilled_cc": unbilled_cc,
            "bills": bills
        }
    }

@router.get("/investments")
async def get_investments_dashboard(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    # Aggregate by SubCategory for Investment Category
    stmt = (
        select(Transaction.sub_category, func.sum(Transaction.amount))
        .where(Transaction.user_id == current_user.id)
        .where(Transaction.category == "Investment")
        .group_by(Transaction.sub_category)
    )
    result = await db.execute(stmt)
    breakdown = {str(row[0]): row[1] for row in result.all()}
    
    total = sum(breakdown.values())
    
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
    history = await get_daily_expenses(db, current_user.id, days=90)
    predicted_burden = service.calculate_safe_to_spend(history)
    
    return {
        "predicted_burden_30d": predicted_burden,
        "confidence": "high" if len(history) > 60 else "medium",
        "description": "Predicted outflows for the next 30 days based on historical trends."
    }
