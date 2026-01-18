import logging
import asyncio
from uuid import UUID
from decimal import Decimal
from typing import Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.features.transactions.models import Transaction, AccountType
from app.features.goals.models import Goal
from app.features.analytics.schemas import (
    CategoryVariance,
    VarianceAnalysis,
    FrozenFundsBreakdown,
    SafeToSpendResponse,
    MonthlySummaryResponse
)
from app.features.bills.service import BillService
from app.features.credit_cards.service import CreditCardService
from app.utils.finance_utils import (
    calculate_frozen_funds,
    calculate_safe_to_spend,
    calculate_variance_percentage,
    get_trend_indicator,
    get_month_date_range,
    get_previous_month_date_range
)

logger = logging.getLogger(__name__)


class AnalyticsService:
    
    def __init__(self):
        self.bill_service = BillService()
        self.cc_service = CreditCardService()
    
    async def get_variance_analysis(
        self,
        db: AsyncSession,
        user_id: UUID,
        month: Optional[int] = None,
        year: Optional[int] = None
    ) -> VarianceAnalysis:
        """Calculate period vs previous period variance."""
        from datetime import date
        target_date = date.today()
        if month and year:
            target_date = date(year, month, 1)
            
        current_range = get_month_date_range(target_date)
        previous_range = get_previous_month_date_range(target_date)
        
        # Current month spending
        # Prepare Current month spending query
        current_stmt = (
            select(
                Transaction.category,
                func.sum(Transaction.amount).label("total")
            )
            .where(Transaction.user_id == user_id)
            .where(Transaction.category != "Income")
            .where(Transaction.transaction_date >= current_range["month_start"])
            .where(Transaction.transaction_date <= current_range["month_end"])
            .group_by(Transaction.category)
        )
        
        # Prepare Previous month spending query
        previous_stmt = (
            select(
                Transaction.category,
                func.sum(Transaction.amount).label("total")
            )
            .where(Transaction.user_id == user_id)
            .where(Transaction.category != "Income")
            .where(Transaction.transaction_date >= previous_range["month_start"])
            .where(Transaction.transaction_date <= previous_range["month_end"])
            .group_by(Transaction.category)
        )
        
        # Execute sequentially
        current_result = await db.execute(current_stmt)
        previous_result = await db.execute(previous_stmt)
        
        current_by_category = {row.category: abs(row.total or Decimal("0")) for row in current_result.all()}
        current_total = sum(current_by_category.values())
        
        previous_by_category = {row.category: abs(row.total or Decimal("0")) for row in previous_result.all()}
        previous_total = sum(previous_by_category.values())
        
        # Calculate category-level variance
        all_categories = set(current_by_category.keys()) | set(previous_by_category.keys())
        category_breakdown = {}
        
        for category in all_categories:
            current_amount = current_by_category.get(category, Decimal("0"))
            previous_amount = previous_by_category.get(category, Decimal("0"))
            variance_amt = current_amount - previous_amount
            variance_pct = calculate_variance_percentage(current_amount, previous_amount)
            
            category_breakdown[category] = CategoryVariance(
                current=current_amount,
                previous=previous_amount,
                variance_amount=variance_amt,
                variance_percentage=variance_pct,
                trend=get_trend_indicator(variance_pct)
            )
        
        # Overall variance
        total_variance = current_total - previous_total
        total_variance_pct = calculate_variance_percentage(
            Decimal(str(current_total)),
            Decimal(str(previous_total))
        )
        
        return VarianceAnalysis(
            current_month_total=Decimal(str(current_total)),
            last_month_total=Decimal(str(previous_total)),
            variance_amount=Decimal(str(total_variance)),
            variance_percentage=total_variance_pct,
            category_breakdown=category_breakdown
        )
    
    async def calculate_burden(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> FrozenFundsBreakdown:
        """Calculate total frozen funds (burden)."""
        # Unpaid bills
        unpaid_bills = await self.bill_service.get_unpaid_bills_total(db, user_id)
        projected_surety = await self.bill_service.get_projected_surety_bills(db, user_id, days_ahead=30)
        unbilled_cc = await self.cc_service.get_all_unbilled_for_user(db, user_id)
        
        # Monthly Goal contribution
        goal_stmt = (
            select(func.sum(Goal.monthly_contribution))
            .where(Goal.user_id == user_id)
            .where(Goal.is_active == True)
        )
        goal_res = await db.execute(goal_stmt)
        
        active_goals = goal_res.scalar() or 0.0
        
        total_frozen = calculate_frozen_funds(unpaid_bills, projected_surety, unbilled_cc) + Decimal(str(active_goals))
        
        return FrozenFundsBreakdown(
            unpaid_bills=unpaid_bills,
            projected_surety=projected_surety,
            unbilled_cc=unbilled_cc,
            active_goals=Decimal(str(active_goals)), # Add this field to schema first!
            total_frozen=total_frozen
        )
    
    async def calculate_safe_to_spend_amount(
        self,
        db: AsyncSession,
        user_id: UUID,
        buffer_percentage: float = 0.10
    ) -> SafeToSpendResponse:
        """Calculate safe-to-spend amount with frozen funds and buffer."""
        # Get current balance (liquid balance across bank/cash)
        # Note: Transaction amounts are signed (Positive Income, Negative Expenses/Investments)
        balance_stmt = (
            select(func.sum(Transaction.amount))
            .where(Transaction.user_id == user_id)
            .where(Transaction.account_type.in_([AccountType.CASH, AccountType.SAVINGS]))
        )
        balance_result = await db.execute(balance_stmt)
        frozen_breakdown = await self.calculate_burden(db, user_id)
        
        current_balance = balance_result.scalar() or Decimal("0")
        
        # Calculate safe-to-spend
        # If balance is negative, safe-to-spend is always 0
        if current_balance <= 0:
            safe_amount = Decimal("0")
            buffer = Decimal("0")
        else:
            buffer = current_balance * Decimal(str(buffer_percentage))
            # frozen_breakdown.total_frozen is returned as a positive burden
            safe_amount = max(Decimal("0"), current_balance - frozen_breakdown.total_frozen - buffer)
        
        # Generate recommendation
        if current_balance <= 0:
            recommendation = "❌ Your balance is negative. Please stop spending immediately and check your inflows."
        elif safe_amount <= 0:
            recommendation = "⚠️ You have no safe spending capacity. Consider paying bills or reducing expenses."
        elif safe_amount < (current_balance * Decimal("0.20")):
            recommendation = "⚡ Low spending capacity. Be cautious with discretionary spending."
        else:
            recommendation = "✅ You have healthy spending capacity. Manage wisely!"
        
        return SafeToSpendResponse(
            current_balance=current_balance,
            frozen_funds=frozen_breakdown,
            buffer_amount=buffer,
            buffer_percentage=buffer_percentage,
            safe_to_spend=safe_amount,
            recommendation=recommendation
        )

    async def get_monthly_summary(
        self,
        db: AsyncSession,
        user_id: UUID,
        month: Optional[int] = None,
        year: Optional[int] = None
    ) -> MonthlySummaryResponse:
        import datetime
        from datetime import date
        
        target_date = date.today()
        if month and year:
            target_date = date(year, month, 1)
        
        current_range = get_month_date_range(target_date)
        
        # Calculate Income for current month
        # Prepare queries
        income_stmt = (
            select(func.sum(Transaction.amount))
            .where(Transaction.user_id == user_id)
            .where(Transaction.category == "Income")
            .where(Transaction.transaction_date >= current_range["month_start"])
            .where(Transaction.transaction_date <= current_range["month_end"])
        )
        
        expense_stmt = (
            select(func.sum(Transaction.amount))
            .where(Transaction.user_id == user_id)
            .where(Transaction.category != "Income")
            .where(Transaction.transaction_date >= current_range["month_start"])
            .where(Transaction.transaction_date <= current_range["month_end"])
        )
        
        # Execute sequentially
        income_result = await db.execute(income_stmt)
        expense_result = await db.execute(expense_stmt)
        
        total_income = income_result.scalar() or Decimal("0")
        total_expense = abs(expense_result.scalar() or Decimal("0"))
        
        balance = total_income - total_expense
        
        return MonthlySummaryResponse(
            total_income=total_income,
            total_expense=total_expense,
            balance=balance,
            month=current_range["month_start"].strftime("%B"),
            year=current_range["month_start"].year
        )
