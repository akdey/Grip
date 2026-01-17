from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.analytics.schemas import (
    VarianceAnalysis,
    FrozenFundsBreakdown,
    SafeToSpendResponse,
    MonthlySummaryResponse
)
from app.features.analytics.service import AnalyticsService

router = APIRouter()

@router.get("/summary/", response_model=MonthlySummaryResponse)
async def get_monthly_summary(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[AnalyticsService, Depends()]
):
    """
    Get monthly financial summary (Income vs Expense).
    """
    return await service.get_monthly_summary(db, current_user.id)


@router.get("/variance/", response_model=VarianceAnalysis)
async def get_variance_analysis(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[AnalyticsService, Depends()]
):
    """
    Get month-to-date vs last month spending variance analysis.
    Compares current month spending with previous month by category.
    """
    return await service.get_variance_analysis(db, current_user.id)


@router.get("/burden/", response_model=FrozenFundsBreakdown)
async def get_burden_calculation(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[AnalyticsService, Depends()]
):
    """
    Calculate total frozen funds (burden).
    Formula: UnpaidBills + ProjectedSuretyBills + UnbilledCC
    """
    return await service.calculate_burden(db, current_user.id)


@router.get("/safe-to-spend/", response_model=SafeToSpendResponse)
async def get_safe_to_spend(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[AnalyticsService, Depends()],
    buffer: float = Query(0.10, ge=0.0, le=0.30, description="Safety buffer percentage (default 10%)")
):
    """
    Calculate safe-to-spend amount with frozen funds and buffer.
    Formula: Balance - FrozenFunds - Buffer
    """
    return await service.calculate_safe_to_spend_amount(db, current_user.id, buffer)
