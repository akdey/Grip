```python
import logging
from uuid import UUID
from decimal import Decimal
from typing import Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.features.transactions.models import Transaction, AccountType
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
        user_id: UUID
    ) -> VarianceAnalysis:
        """Calculate month-to-date vs last month variance."""
        current_range = get_month_date_range()
        previous_range = get_previous_month_date_range()
        
        # Current month spending
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
        
        current_result = await db.execute(current_stmt)
        current_by_category = {row.category: (row.total or Decimal("0")) for row in current_result.all()}
        current_total = sum(current_by_category.values())
        
        # Previous month spending
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
        
        previous_result = await db.execute(previous_stmt)
        previous_by_category = {row.category: (row.total or Decimal("0")) for row in previous_result.all()}
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
        
        # Projected surety bills (next 30 days)
        projected_surety = await self.bill_service.get_projected_surety_bills(
            db, user_id, days_ahead=30
        )
        
        # Unbilled credit card spending
        unbilled_cc = await self.cc_service.get_all_unbilled_for_user(db, user_id)
        
        total_frozen = calculate_frozen_funds(unpaid_bills, projected_surety, unbilled_cc)
        
        return FrozenFundsBreakdown(
            unpaid_bills=unpaid_bills,
            projected_surety=projected_surety,
            unbilled_cc=unbilled_cc,
            total_frozen=total_frozen
        )
    
    async def calculate_safe_to_spend_amount(
        self,
        db: AsyncSession,
        user_id: UUID,
        buffer_percentage: float = 0.10
    ) -> SafeToSpendResponse:
        """Calculate safe-to-spend amount with frozen funds and buffer."""
        # Get current balance (income - expenses in savings/cash)
        income_stmt = (
            select(func.sum(Transaction.amount))
            .where(Transaction.user_id == user_id)
            .where(Transaction.category == "Income")
        )
        income_result = await db.execute(income_stmt)
        total_income = income_result.scalar() or Decimal("0")
        
        expense_stmt = (
            select(func.sum(Transaction.amount))
            .where(Transaction.user_id == user_id)
            .where(Transaction.category.not_in(["Income", "Investment"]))
            .where(Transaction.account_type.in_([AccountType.CASH, AccountType.SAVINGS]))
        )
        expense_result = await db.execute(expense_stmt)
        total_expenses = expense_result.scalar() or Decimal("0")
        
        current_balance = total_income - total_expenses
        
        # Get frozen funds
        frozen_breakdown = await self.calculate_burden(db, user_id)
        
        # Calculate safe-to-spend
        buffer = current_balance * Decimal(str(buffer_percentage))
        safe_amount = calculate_safe_to_spend(
            current_balance,
            frozen_breakdown.total_frozen,
            buffer_percentage
        )
        
        # Generate recommendation
        if safe_amount <= 0:
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
        user_id: UUID
    ) -> MonthlySummaryResponse:
        import datetime
        
        current_range = get_month_date_range()
        
        # Calculate Income for current month
        income_stmt = (
            select(func.sum(Transaction.amount))
            .where(Transaction.user_id == user_id)
            .where(Transaction.category == "Income")
            .where(Transaction.transaction_date >= current_range["month_start"])
            .where(Transaction.transaction_date <= current_range["month_end"])
        )
        income_result = await db.execute(income_stmt)
        total_income = income_result.scalar() or Decimal("0")
        
        # Calculate Expenses for current month
        expense_stmt = (
            select(func.sum(Transaction.amount))
            .where(Transaction.user_id == user_id)
            .where(Transaction.category != "Income")
            .where(Transaction.transaction_date >= current_range["month_start"])
            .where(Transaction.transaction_date <= current_range["month_end"])
        )
        expense_result = await db.execute(expense_stmt)
        total_expense = expense_result.scalar() or Decimal("0")
        
        balance = total_income - total_expense
        
        return MonthlySummaryResponse(
            total_income=total_income,
            total_expense=total_expense,
            balance=balance,
            month=current_range["month_start"].strftime("%B"),
            year=current_range["month_start"].year
        )
```
