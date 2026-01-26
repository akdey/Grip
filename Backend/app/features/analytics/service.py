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
    get_previous_month_date_range,
    get_year_date_range
)

from datetime import datetime, date, timedelta
import zoneinfo
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class AnalyticsService:
    
    def __init__(self):
        self.bill_service = BillService()
        self.cc_service = CreditCardService()
        self._tz = zoneinfo.ZoneInfo(settings.APP_TIMEZONE)

    def _get_today(self) -> date:
        """Get current date in the configured timezone."""
        return datetime.now(self._tz).date()
    
    async def get_variance_analysis(
        self,
        db: AsyncSession,
        user_id: UUID,
        month: Optional[int] = None,
        year: Optional[int] = None
    ) -> VarianceAnalysis:
        """Calculate period vs previous period variance."""
        target_date = self._get_today()
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
            .where(Transaction.category.notin_(["Income"]))
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
            .where(Transaction.category.notin_(["Income"]))
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
        try:
            # Unpaid bills
            unpaid_bills = await self.bill_service.get_unpaid_bills_total(db, user_id)
            projected_surety = await self.bill_service.get_projected_surety_bills(db, user_id, days_ahead=30)
            unbilled_cc = await self.cc_service.get_all_unbilled_for_user(db, user_id)
            
            # Monthly Goal contribution
            active_goals = 0.0
            try:
                goal_stmt = (
                    select(func.sum(Goal.monthly_contribution))
                    .where(Goal.user_id == user_id)
                    .where(Goal.is_active == True)
                )
                goal_res = await db.execute(goal_stmt)
                active_goals = goal_res.scalar() or 0.0
            except Exception as e:
                logger.warning(f"Failed to calculate goals: {e}")
                active_goals = 0.0
            
            total_frozen = calculate_frozen_funds(unpaid_bills, projected_surety, unbilled_cc) + Decimal(str(active_goals))
            
            return FrozenFundsBreakdown(
                unpaid_bills=unpaid_bills,
                projected_surety=projected_surety,
                unbilled_cc=unbilled_cc,
                active_goals=Decimal(str(active_goals)),
                total_frozen=total_frozen
            )
        except Exception as e:
            logger.error(f"Error calculating burden: {e}")
            # Return safe zeros to prevent 500
            zero = Decimal("0.00")
            return FrozenFundsBreakdown(
                unpaid_bills=zero,
                projected_surety=zero,
                unbilled_cc=zero,
                active_goals=zero,
                total_frozen=zero
            )
    
    async def calculate_safe_to_spend_amount(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> SafeToSpendResponse:
        """Calculate safe-to-spend amount with frozen funds and AI-predicted buffer till salary."""
        try:
            # Calculate days till salary (1st of next month)
            today = self._get_today()
            if today.day == 1:
                # If today is 1st, assume salary already received, buffer till next month's 1st
                days_till_salary = 30  # Approximate
            else:
                # Days remaining in current month
                import calendar
                _, last_day = calendar.monthrange(today.year, today.month)
                days_till_salary = last_day - today.day + 1
            
            # Get current balance (liquid balance across bank/cash)
            balance_stmt = (
                select(func.sum(Transaction.amount))
                .where(Transaction.user_id == user_id)
                .where(Transaction.account_type.in_([AccountType.CASH, AccountType.SAVINGS]))
            )
            balance_result = await db.execute(balance_stmt)
            frozen_breakdown = await self.calculate_burden(db, user_id)
            
            current_balance = balance_result.scalar() or Decimal("0")
            
            # Check if user has any transactions at all (to distinguish new vs existing users)
            txn_count_stmt = (
                select(func.count(Transaction.id))
                .where(Transaction.user_id == user_id)
            )
            txn_count_result = await db.execute(txn_count_stmt)
            total_transactions = txn_count_result.scalar() or 0
            is_new_user = total_transactions == 0
            
            # Calculate buffer using simple average of discretionary spending
            # Get discretionary expenses from last 30 days
            today_date = self._get_today()
            thirty_days_ago = today_date - timedelta(days=30)
            
            discretionary_stmt = (
                select(func.sum(Transaction.amount))
                .where(Transaction.user_id == user_id)
                .where(Transaction.category.notin_(["Income", "Investment", "Housing", "Bill Payment", "Transfer", "EMI", "Loan", "Insurance", "Misc"]))
                .where(Transaction.sub_category != "Credit Card Payment")
                .where(Transaction.is_surety == False)
                .where(func.abs(Transaction.amount) <= 5000)  # Exclude large one-off purchases > 5k
                .where(Transaction.transaction_date >= thirty_days_ago)
                .where(Transaction.transaction_date <= today_date)
            )
            discretionary_result = await db.execute(discretionary_stmt)
            total_discretionary_30d = abs(discretionary_result.scalar() or Decimal("0"))
            
            # Calculate average daily discretionary expense
            avg_daily_discretionary = total_discretionary_30d / Decimal("30")
            
            # Buffer = Average daily discretionary × days till salary
            buffer = avg_daily_discretionary * Decimal(str(days_till_salary))
            
            # Only enforce minimum buffer if user has positive balance
            if current_balance > 0:
                min_buffer = Decimal("500")
                buffer = max(buffer, min_buffer)
            else:
                # No/negative balance means no buffer needed
                buffer = Decimal("0")
            
            # Set method for display
            buffer_method = "average"
            buffer_confidence = "medium"
            
            # Calculate safe-to-spend
            # If balance is zero or negative, safe_to_spend should be 0 (can't spend what you don't have)
            if current_balance <= 0:
                safe_amount = Decimal("0")
            else:
                safe_amount = current_balance - frozen_breakdown.total_frozen - buffer
                # Cap at 0 minimum (can't spend negative amounts)
                safe_amount = max(Decimal("0"), safe_amount)
            
            # Calculate buffer as percentage for response (for UI display)
            buffer_percentage = float(buffer / current_balance) if current_balance > 0 else 0.0
            
            # Format salary date for display
            next_month = today.replace(day=1) + timedelta(days=32)
            salary_date = next_month.replace(day=1)
            salary_str = salary_date.strftime("%b %d")
            
            # Generate recommendation based on user state
            status = "success"
            
            if is_new_user:
                recommendation = "👋 Welcome! Add your first transaction to start tracking your finances."
                status = "success"
            elif current_balance < 0:
                deficit = abs(current_balance)
                recommendation = f"📉 Balance is ₹{deficit:.0f} in deficit. Add income to recover."
                status = "negative"
            elif current_balance == 0:
                recommendation = "⚠️ No liquid balance available. Please add income transactions."
                status = "warning"
            elif safe_amount == 0:
                overextended = frozen_breakdown.total_frozen + buffer - current_balance
                recommendation = f"🔒 Overextended by ₹{overextended:.0f}. Frozen + Buffer exceed balance."
                status = "critical"
            elif safe_amount < (current_balance * Decimal("0.20")):
                recommendation = f"⚡ Low capacity. ₹{buffer:.0f} reserved till salary ({salary_str})"
                status = "warning"
            else:
                recommendation = f"✅ Healthy! ₹{buffer:.0f} buffered till salary ({salary_str})"
                status = "success"
            
            return SafeToSpendResponse(
                current_balance=current_balance,
                frozen_funds=frozen_breakdown,
                buffer_amount=buffer,
                buffer_percentage=buffer_percentage,
                safe_to_spend=safe_amount,
                recommendation=recommendation,
                status=status
            )
        except Exception as e:
            logger.error(f"Error calculating safe to spend: {e}")
            # ... (error handling code remains the same) ...
            # Return safe default
            zero = Decimal("0.00")
            empty_breakdown = FrozenFundsBreakdown(
                unpaid_bills=zero,
                projected_surety=zero,
                unbilled_cc=zero,
                active_goals=zero,
                total_frozen=zero
            )
            return SafeToSpendResponse(
                current_balance=zero,
                frozen_funds=empty_breakdown,
                buffer_amount=zero,
                buffer_percentage=0.0,
                safe_to_spend=zero,
                recommendation="⚠️ Unable to calculate. Please check system logs.",
                status="warning"
            )

    async def debug_buffer_Calculation(self, db: AsyncSession, user_id: UUID):
        """Debug method to show WHAT is being included in buffer calculation."""
        today_date = self._get_today()
        thirty_days_ago = today_date - timedelta(days=30)
        
        # EXACT SAME logic as calculation
        stmt = (
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .where(Transaction.category.notin_(["Income", "Investment", "Housing", "Bill Payment", "Transfer", "EMI", "Loan", "Insurance", "Misc"]))
            .where(Transaction.sub_category != "Credit Card Payment")
            .where(Transaction.is_surety == False)
            .where(func.abs(Transaction.amount) <= 5000)  # Exclude large one-off purchases > 5k
            .where(Transaction.transaction_date >= thirty_days_ago)
            .where(Transaction.transaction_date <= today_date)
            .order_by(Transaction.amount) # Sort by amount (negative first = biggest spenders)
        )
        
        result = await db.execute(stmt)
        txns = result.scalars().all()
        
        total = sum(abs(t.amount) for t in txns)
        
        return {
            "total_discretionary_30d": total,
            "daily_average": total / 30,
            "count": len(txns),
            "transactions": [
                {
                    "date": t.transaction_date,
                    "amount": t.amount,
                    "merchant": t.merchant_name,
                    "category": t.category,
                    "sub_category": t.sub_category
                }
                for t in txns
            ]
        }

    async def get_monthly_summary(
        self,
        db: AsyncSession,
        user_id: UUID,
        month: Optional[int] = None,
        year: Optional[int] = None,
        scope: str = "month"
    ) -> MonthlySummaryResponse:
        import datetime
        
        target_date = self._get_today()
        if month and year:
            target_date = date(year, month, 1)
        
        # Determine date range based on scope
        if scope == "year":
            date_range = get_year_date_range(target_date)
            start_date = date_range["year_start"]
            end_date = date_range["year_end"]
            period_label = str(start_date.year)
        elif scope == "all":
            # For all time, start from year 2000
            start_date = date(2000, 1, 1)
            end_date = date(2100, 12, 31)
            period_label = "All Time"
        else:
            # Default to month
            date_range = get_month_date_range(target_date)
            start_date = date_range["month_start"]
            end_date = date_range["month_end"]
            period_label = start_date.strftime("%B")

        # Calculate Income
        income_stmt = (
            select(func.sum(Transaction.amount))
            .where(Transaction.user_id == user_id)
            .where(Transaction.category == "Income")
            .where(Transaction.transaction_date >= start_date)
            .where(Transaction.transaction_date <= end_date)
        )
        
        expense_stmt = (
            select(func.sum(Transaction.amount))
            .where(Transaction.user_id == user_id)
            .where(Transaction.category.notin_(["Income"]))
            .where(Transaction.transaction_date >= start_date)
            .where(Transaction.transaction_date <= end_date)
        )
        
        # Execute sequentially
        income_result = await db.execute(income_stmt)
        expense_result = await db.execute(expense_stmt)
        
        total_income = income_result.scalar() or Decimal("0")
        total_expense_raw = abs(expense_result.scalar() or Decimal("0"))
        
        
        # Calculate Prior Period Settlement (Strictly Credit Card Payments)
        # We assume these payments are for previous month's dues.
        prior_settlement_stmt = (
            select(func.sum(Transaction.amount))
            .where(Transaction.user_id == user_id)
            .where(Transaction.sub_category == "Credit Card Payment")
            .where(Transaction.transaction_date >= start_date)
            .where(Transaction.transaction_date <= end_date)
        )
        prior_res = await db.execute(prior_settlement_stmt)
        prior_period_settlement = abs(prior_res.scalar() or Decimal("0"))
        
        # Current Period Expense is Total Expense minus the settlements
        # (Assuming total_expense_raw includes the CC payments, which it does as they are not Income)
        current_period_expense = total_expense_raw - prior_period_settlement
        
        balance_stmt = (
            select(func.sum(Transaction.amount))
            .where(Transaction.user_id == user_id)
            .where(Transaction.transaction_date >= start_date)
            .where(Transaction.transaction_date <= end_date)
        )
        balance_res = await db.execute(balance_stmt)
        net_balance = balance_res.scalar() or Decimal("0")
        
        return MonthlySummaryResponse(
            total_income=total_income,
            total_expense=total_expense_raw,
            balance=net_balance,
            month=period_label,
            year=target_date.year,
            current_period_expense=current_period_expense,
            prior_period_settlement=prior_period_settlement
        )
