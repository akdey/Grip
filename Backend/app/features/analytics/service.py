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
        
        # Execute sequentially to avoid "another operation is in progress" errors
        current_res = await db.execute(current_stmt)
        previous_res = await db.execute(previous_stmt)
        
        current_by_category = {row.category: abs(row.total or Decimal("0")) for row in current_res.all()}
        current_total = sum(current_by_category.values())
        
        previous_by_category = {row.category: abs(row.total or Decimal("0")) for row in previous_res.all()}
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
        """Calculate total frozen funds (burden) with a detailed obligation ledger."""
        try:
            from app.features.analytics.schemas import IdentifiedObligation
            import calendar
            # wealth_service removed for decoupling

            
            today = self._get_today()
            _, last_day = calendar.monthrange(today.year, today.month)
            days_till_month_end = last_day - today.day
            
            goal_stmt = (
                select(Goal)
                .where(Goal.user_id == user_id)
                .where(Goal.is_active == True)
            )
            
            # 1. Execute multiple independent checks sequentially to avoid concurrency conflicts
            ledger_data = await self.bill_service.get_obligations_ledger(db, user_id, days_ahead=days_till_month_end)
            unbilled_cc = await self.cc_service.get_all_unbilled_for_user(db, user_id)
            goal_res = await db.execute(goal_stmt)

            # 2. Process Bill/Surety results
            unpaid_bills_total = ledger_data["unpaid_total"]
            projected_surety_bills = ledger_data["projected_total"]
            all_obligations = ledger_data["items"]
            
            # 3. Process SIP Commitments (Placeholder)
            sip_total = Decimal("0")
            total_projected_surety = projected_surety_bills + sip_total
            
            # 4. Process Goals
            active_goals_total = Decimal("0")
            goals = goal_res.scalars().all()
            for g in goals:
                amt = Decimal(str(g.monthly_contribution))
                active_goals_total += amt
                # Add goals to ledger items
                all_obligations.append(IdentifiedObligation(
                    id=f"goal-{g.id}",
                    title=f"Goal: {g.name}",
                    amount=amt,
                    due_date=date.today() + timedelta(days=15),
                    type="GOAL",
                    status="PROJECTED",
                    category="Goal",
                    sub_category=g.category
                ))
            
            total_frozen = calculate_frozen_funds(unpaid_bills_total, total_projected_surety, unbilled_cc) + active_goals_total
            
            return FrozenFundsBreakdown(
                unpaid_bills=unpaid_bills_total,
                projected_surety=total_projected_surety,
                unbilled_cc=unbilled_cc,
                active_goals=active_goals_total,
                total_frozen=total_frozen,
                obligations=all_obligations
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
        """Calculate safe-to-spend amount with frozen funds and mathematical buffer till salary."""
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
            
            # 1. Prepare combined query to fetch everything in ONE trip
            today_date = self._get_today()
            thirty_days_ago = today_date - timedelta(days=30)
            
            # Subquery for discretionary sum
            discretionary_sub = (
                select(func.sum(Transaction.amount))
                .where(Transaction.user_id == user_id)
                .where(Transaction.category.notin_(["Income", "Investment", "Housing", "Bill Payment", "Transfer", "EMI", "Loan", "Insurance", "Misc"]))
                .where(Transaction.sub_category != "Credit Card Payment")
                .where(Transaction.is_surety == False)
                .where(func.abs(Transaction.amount) <= 5000)
                .where(Transaction.transaction_date >= thirty_days_ago)
                .where(Transaction.transaction_date <= today_date)
                .scalar_subquery()
            )

            # Mega query: Total Balance, Txn Count, and Discretionary Sum
            mega_stmt = (
                select(
                    func.sum(Transaction.amount).label("balance"),
                    func.count(Transaction.id).label("txn_count"),
                    discretionary_sub.label("discretionary_sum")
                )
                .where(Transaction.user_id == user_id)
                .where(Transaction.account_type.in_([AccountType.CASH, AccountType.SAVINGS]))
            )

            # 2. Execute sequentially - but now we only have 2 main hits (Mega + Burden)
            mega_res = (await db.execute(mega_stmt)).one()
            frozen_breakdown = await self.calculate_burden(db, user_id)
            
            # 3. Process results
            current_balance = mega_res.balance or Decimal("0")
            total_transactions = mega_res.txn_count or 0
            is_new_user = total_transactions == 0
            total_discretionary_30d = abs(mega_res.discretionary_sum or Decimal("0"))
            
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
        income_res = await db.execute(income_stmt)
        expense_res = await db.execute(expense_stmt)
        
        total_income = income_res.scalar() or Decimal("0")
        total_expense_raw = abs(expense_res.scalar() or Decimal("0"))
        
        
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

    async def get_spend_trends(
        self,
        db: AsyncSession,
        user_id: UUID,
        days: int = 30,
        frequency: str = "daily"
    ):
        """Get spending trends for the last N days/weeks/months."""
        from app.features.analytics.schemas import SpendTrendPoint, SpendTrendResponse
        
        today = self._get_today()
        
        if frequency == "monthly":
            # Group by month for last 6 months
            start_date = (today.replace(day=1) - timedelta(days=180)).replace(day=1)
            date_field = func.date_trunc('month', Transaction.transaction_date)
            limit_points = 6
        elif frequency == "weekly":
            # Group by week for last 12 weeks
            start_date = today - timedelta(weeks=12)
            date_field = func.date_trunc('week', Transaction.transaction_date)
            limit_points = 12
        else:
            # Default Daily
            start_date = today - timedelta(days=days + 5)
            date_field = Transaction.transaction_date
            limit_points = days

        stmt = (
            select(
                date_field.label("date"),
                func.sum(func.abs(Transaction.amount)).label("amount")
            )
            .where(Transaction.user_id == user_id)
            .where(Transaction.category.notin_(["Income", "Transfer"]))
            .where(Transaction.transaction_date >= start_date)
            .where(Transaction.transaction_date <= today)
            .group_by(date_field)
            .order_by(date_field)
        )
        
        result = await db.execute(stmt)
        data_points = result.all()
        
        if frequency == "daily":
            # Apply 3-day rolling average for daily
            trends_map = {row.date: row.amount for row in data_points}
            all_daily = []
            full_start = today - timedelta(days=days + 2)
            for i in range(days + 3):
                d = full_start + timedelta(days=i)
                all_daily.append({"date": d, "amount": trends_map.get(d, Decimal("0"))})
            
            final_trends = []
            for i in range(2, len(all_daily)):
                d = all_daily[i]["date"]
                if d < today - timedelta(days=days - 1): continue
                avg_amount = (all_daily[i]["amount"] + all_daily[i-1]["amount"] + all_daily[i-2]["amount"]) / 3
                final_trends.append(SpendTrendPoint(date=d, amount=avg_amount))
            return SpendTrendResponse(trends=final_trends)

        # For Weekly and Monthly, just return the data points
        return SpendTrendResponse(trends=[
            SpendTrendPoint(date=row.date if isinstance(row.date, date) else row.date.date(), amount=row.amount)
            for row in data_points
        ])
