import logging
import calendar
import math
from uuid import UUID, uuid4
from datetime import date, timedelta
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, and_

from app.features.goals.models import Goal
from app.features.goals.schemas import GoalCreate, FeasibilityCheck
from app.features.analytics.service import AnalyticsService
from app.features.bills.service import BillService
from app.features.transactions.models import Transaction, AccountType

logger = logging.getLogger(__name__)

class GoalService:
    def __init__(self):
        self.analytics_service = AnalyticsService()
        self.bill_service = BillService()

    def _calculate_timeline(self, target_amount: float, target_date: date) -> tuple[int, float, float, float]:
        today = date.today()
        days_remaining = (target_date - today).days
        if days_remaining <= 0:
            return (0, 1.0, target_amount, target_amount)
        
        months_remaining = max(1.0, round(days_remaining / 30.4, 1))
        required_monthly = round(target_amount / months_remaining, 2)
        daily_saving = round(target_amount / days_remaining, 2)
        return (days_remaining, months_remaining, required_monthly, daily_saving)

    def _count_salary_cycles(self, start_date: date, end_date: date, payday_day: int) -> int:
        """Counts how many times payday_day occurs strictly after start_date and up to end_date."""
        if start_date >= end_date:
            return 0
        
        cycles = 0
        cur_year = start_date.year
        cur_month = start_date.month
        
        while True:
            _, max_days = calendar.monthrange(cur_year, cur_month)
            actual_day = min(payday_day, max_days)
            pay_date = date(cur_year, cur_month, actual_day)
            
            if start_date < pay_date <= end_date:
                cycles += 1
                
            if pay_date > end_date:
                break
                
            if cur_month == 12:
                cur_month = 1
                cur_year += 1
            else:
                cur_month += 1
                
            if (cur_year - start_date.year) * 12 + (cur_month - start_date.month) > 120:
                break
                
        return cycles

    def _find_date_for_salary_cycles(self, start_date: date, payday_day: int, cycles_needed: int) -> date:
        """Find the date after N salary cycles have occurred (payday + 5 days buffer)."""
        cur_year = start_date.year
        cur_month = start_date.month
        cycles_seen = 0
        
        while True:
            _, max_days = calendar.monthrange(cur_year, cur_month)
            actual_day = min(payday_day, max_days)
            pay_date = date(cur_year, cur_month, actual_day)
            
            if pay_date > start_date:
                cycles_seen += 1
                if cycles_seen >= cycles_needed:
                    target_day = min(actual_day + 5, max_days)
                    return date(cur_year, cur_month, target_day)
            
            if cur_month == 12:
                cur_month = 1
                cur_year += 1
            else:
                cur_month += 1
                
            if (cur_year - start_date.year) * 12 + (cur_month - start_date.month) > 120:
                break
                
        return start_date + timedelta(days=cycles_needed * 30)

    async def _get_historical_surplus(self, db: AsyncSession, user_id: UUID) -> tuple[float, float, float, float, int]:
        today = date.today()
        ninety_days_ago = today - timedelta(days=90)

        # 1. Total liquid income in last 90 days and date patterns
        income_stmt = (
            select(Transaction.amount, Transaction.transaction_date)
            .where(Transaction.user_id == user_id)
            .where(Transaction.transaction_date >= ninety_days_ago)
            .where(
                or_(
                    Transaction.category == "Income",
                    and_(Transaction.amount > 0, Transaction.account_type.in_([AccountType.CASH, AccountType.SAVINGS]))
                )
            )
        )
        income_res = await db.execute(income_stmt)
        income_rows = income_res.all()
        
        total_income_90d = float(sum((Decimal(str(r[0])) for r in income_rows if r[0] is not None), Decimal(0)))

        # Check earliest transaction to know months active
        earliest_stmt = select(func.min(Transaction.transaction_date)).where(Transaction.user_id == user_id)
        earliest_date = (await db.execute(earliest_stmt)).scalar()
        if earliest_date:
            days_active = max(1, (today - earliest_date).days)
            months_active = max(1.0, min(3.0, days_active / 30.0))
        else:
            months_active = 1.0

        avg_monthly_income = total_income_90d / months_active

        # Auto-detect most frequent payday day of month from substantial income credits
        detected_payday_day = 1
        substantial_days = [r[1].day for r in income_rows if r[1] and (r[0] or 0) >= 5000]
        if substantial_days:
            from collections import Counter
            detected_payday_day = Counter(substantial_days).most_common(1)[0][0]

        # 2. Get real fixed obligations for upcoming monthly cycle
        # Query ahead 60 days to capture the upcoming month's full recurring commitments (Sureties + Recurring Bills)
        if today.month == 12:
            next_m_year = today.year + 1
            next_m_month = 1
        else:
            next_m_year = today.year
            next_m_month = today.month + 1

        upcoming_ledger = await self.bill_service.get_obligations_ledger(db, user_id, days_ahead=60, include_hidden=True)
        upcoming_items = [
            item for item in upcoming_ledger.get("items", [])
            if item.due_date and item.due_date.year == next_m_year and item.due_date.month == next_m_month
            and getattr(item, "status", "") != "TERMINATED"
        ]
        upcoming_fixed_obligations = sum(float(item.amount) for item in upcoming_items)

        # Current cycle safe response for Cash in Hand and baseline living buffer
        safe_resp = await self.analytics_service.calculate_safe_to_spend_amount(db, user_id)
        current_safe = float(safe_resp.safe_to_spend)

        # Fallback if no upcoming month items yet: use current total burden
        if upcoming_fixed_obligations <= 0:
            upcoming_fixed_obligations = float(
                safe_resp.frozen_funds.unpaid_bills +
                safe_resp.frozen_funds.projected_surety +
                safe_resp.frozen_funds.unbilled_cc
            )

        # Account for existing goals in the monthly burden
        existing_goals_contrib = await self.get_total_monthly_goal_contribution(db, user_id)
        upcoming_fixed_obligations += float(existing_goals_contrib)

        # Discretionary daily rate scaled to 30 days
        _, days_in_month = calendar.monthrange(today.year, today.month)
        days_left_in_month = max(1, days_in_month - today.day + 1)
        daily_discretionary = float(safe_resp.buffer_amount) / days_left_in_month
        monthly_discretionary = daily_discretionary * 30.0

        total_monthly_burn = upcoming_fixed_obligations + monthly_discretionary
        net_monthly_surplus = max(0.0, avg_monthly_income - total_monthly_burn)

        # Days remaining until next salary payday
        _, max_days = calendar.monthrange(today.year, today.month)
        actual_payday = min(detected_payday_day, max_days)
        if today.day < actual_payday:
            next_payday = date(today.year, today.month, actual_payday)
        else:
            if today.month == 12:
                next_payday = date(today.year + 1, 1, min(detected_payday_day, 31))
            else:
                _, next_max = calendar.monthrange(today.year, today.month + 1)
                next_payday = date(today.year, today.month + 1, min(detected_payday_day, next_max))
        days_left_in_cycle = max(1, (next_payday - today).days)

        return (avg_monthly_income, total_monthly_burn, net_monthly_surplus, current_safe, detected_payday_day, upcoming_fixed_obligations, monthly_discretionary, days_left_in_cycle)

    def _calculate_monthly_contribution(self, target_amount: float, target_date: date) -> float:
        _, months_remaining, required_monthly, _ = self._calculate_timeline(target_amount, target_date)
        return required_monthly

    async def check_feasibility(self, db: AsyncSession, user_id: UUID, goal: GoalCreate) -> FeasibilityCheck:
        days_remaining, months_remaining, required_monthly, daily_needed = self._calculate_timeline(
            goal.target_amount, goal.target_date
        )
        
        avg_income, total_monthly_burn, net_monthly_surplus, current_safe, payday_day, upcoming_obligations, monthly_living, days_left_in_cycle = await self._get_historical_surplus(db, user_id)

        # Determine smart default freeze percentage based on days left in salary cycle
        # Since Safe-to-Spend already covers all bills, sureties, and living buffer:
        # - Late in cycle (<=5 days to payday): high surplus allocation (75%) is painless
        # - Mid-cycle (6-15 days): balanced allocation (50%)
        # - Early in cycle (>15 days): conservative allocation (30%) preserves discretionary liquidity
        if days_left_in_cycle <= 5:
            default_freeze_pct = 75.0
        elif days_left_in_cycle <= 15:
            default_freeze_pct = 50.0
        else:
            default_freeze_pct = 30.0

        # User's slider override (0 to 100) takes precedence over default
        current_freeze_pct = goal.freeze_percentage if (goal.freeze_percentage is not None and goal.freeze_percentage >= 0) else default_freeze_pct
        effective_cap_fraction = min(1.0, max(0.0, current_freeze_pct / 100.0))

        # Determine effective income and surplus (custom user override takes precedence)
        has_custom_income = goal.custom_expected_income is not None and goal.custom_expected_income > 0
        effective_income = goal.custom_expected_income if has_custom_income else avg_income
        effective_surplus = max(0.0, effective_income - total_monthly_burn)

        # Count actual salary cycles arriving before target date
        salary_cycles = self._count_salary_cycles(date.today(), goal.target_date, payday_day)

        safe_cap = max(0.0, current_safe * effective_cap_fraction)

        if salary_cycles == 0:
            # Short-term (target date is before next salary payday)
            current_freeze = min(goal.target_amount, safe_cap)
            next_cycle_contrib = max(0.0, goal.target_amount - current_freeze)
            projected_total = current_safe
            is_feasible = current_safe >= goal.target_amount
        else:
            # One or more salary cycles arrive before target deadline!
            current_freeze = min(required_monthly, safe_cap)
            next_cycle_contrib = max(0.0, (goal.target_amount - current_freeze) / max(1, salary_cycles))
            
            projected_future_savings = salary_cycles * effective_surplus
            projected_total = current_safe + projected_future_savings
            is_feasible = (projected_total >= goal.target_amount) or (current_safe >= goal.target_amount)

        current_freeze = round(current_freeze, 2)
        next_cycle_contrib = round(next_cycle_contrib, 2)
        projected_total = round(projected_total, 2)
        cushion_after_freeze = round(max(0.0, current_safe - current_freeze), 2)

        # Diagnostic explanation message
        if is_feasible:
            cushion = cushion_after_freeze
            if salary_cycles > 0:
                surplus_buffer = projected_total - goal.target_amount
                msg = (
                    f"✅ Plan looks solid! Target ₹{goal.target_amount:,.0f} across {days_remaining} days. "
                    f"Freezing {current_freeze_pct:.0f}% of Safe-to-Spend (₹{current_freeze:,.0f}) leaves ₹{cushion:,.0f} pure cushion for the remaining {days_left_in_cycle} days before payday. "
                    f"The remaining target will be covered by {salary_cycles} upcoming salary cycle(s) (~₹{next_cycle_contrib:,.0f}/cycle) from your projected monthly surplus."
                )
            else:
                msg = f"✅ Plan looks solid! ₹{goal.target_amount:,.0f} is fully covered by your current safe buffer (₹{current_safe:,.0f})."
        else:
            shortfall = max(0.0, goal.target_amount - projected_total)
            if salary_cycles > 0:
                msg = (
                    f"⚠️ Target is tight. Even with {salary_cycles} expected salary cycle(s), your projected savings capacity is "
                    f"₹{projected_total:,.0f} (shortfall of ₹{shortfall:,.0f}). "
                    f"After upcoming recurring obligations (~₹{upcoming_obligations:,.0f}) and living burn (~₹{monthly_living:,.0f}/mo), "
                    f"monthly surplus is ~₹{effective_surplus:,.0f}. To hit ₹{goal.target_amount:,.0f}, you need ₹{daily_needed:,.0f}/day."
                )
            else:
                msg = (
                    f"⚠️ Due before next payday. Target date is before your next salary cycle. "
                    f"Available cash in hand is ₹{current_safe:,.0f} (shortfall of ₹{shortfall:,.0f})."
                )

        # Suggestions for what-if optimization when tight
        suggested_target_date = None
        suggested_target_amount = None
        suggested_cycles_needed = None

        if not is_feasible:
            # 1. Suggested amount achievable by current target date
            if projected_total > 0:
                suggested_target_amount = round(projected_total, 2)
            else:
                suggested_target_amount = round(current_safe, 2)

            # 2. Suggested date to achieve original target amount
            needed_from_surplus = max(0.0, goal.target_amount - current_safe)
            if effective_surplus > 0:
                cycles_needed = math.ceil(needed_from_surplus / effective_surplus)
                suggested_cycles_needed = max(1, cycles_needed)
                suggested_target_date = self._find_date_for_salary_cycles(date.today(), payday_day, suggested_cycles_needed)

        return FeasibilityCheck(
            is_feasible=is_feasible,
            required_monthly_savings=required_monthly,
            available_monthly_liquidity=current_safe,
            projected_monthly_surplus=round(effective_surplus, 2),
            projected_total_savings=projected_total,
            current_cycle_freeze=current_freeze,
            next_cycle_contribution=next_cycle_contrib,
            days_remaining=days_remaining,
            daily_saving_needed=daily_needed,
            detected_income=round(effective_income, 2),
            detected_payday_day=payday_day,
            salary_cycles_count=salary_cycles,
            monthly_obligations_burn=round(total_monthly_burn, 2),
            default_freeze_percentage=default_freeze_pct,
            current_freeze_percentage=current_freeze_pct,
            days_left_in_cycle=days_left_in_cycle,
            cushion_after_freeze=cushion_after_freeze,
            message=msg,
            suggested_target_date=suggested_target_date,
            suggested_target_amount=suggested_target_amount,
            suggested_cycles_needed=suggested_cycles_needed
        )

    async def create_goal(self, db: AsyncSession, user_id: UUID, goal_data: GoalCreate) -> Goal:
        days_remaining, months_remaining, required_monthly, _ = self._calculate_timeline(
            goal_data.target_amount, goal_data.target_date
        )
        _, _, _, current_safe, payday_day, _, _, days_left_in_cycle = await self._get_historical_surplus(db, user_id)
        salary_cycles = self._count_salary_cycles(date.today(), goal_data.target_date, payday_day)
        
        # Calculate smart default freeze percentage based on days left in cycle
        if days_left_in_cycle <= 5:
            default_pct = 75.0
        elif days_left_in_cycle <= 15:
            default_pct = 50.0
        else:
            default_pct = 30.0

        current_freeze_pct = goal_data.freeze_percentage if (goal_data.freeze_percentage is not None and goal_data.freeze_percentage >= 0) else default_pct
        effective_cap_fraction = min(1.0, max(0.0, current_freeze_pct / 100.0))
        safe_cap = max(0.0, current_safe * effective_cap_fraction)

        if salary_cycles == 0:
            monthly_contrib = min(goal_data.target_amount, safe_cap)
        else:
            monthly_contrib = min(required_monthly, safe_cap)
            
        # Ensure at least 0.0, and if safe_cap is 0, default to required so goal is actively tracked
        if monthly_contrib <= 0 and current_safe <= 0:
            monthly_contrib = required_monthly

        monthly_contrib = round(monthly_contrib, 2)
        
        goal = Goal(
            id=uuid4(),
            user_id=user_id,
            name=goal_data.name,
            target_amount=goal_data.target_amount,
            target_date=goal_data.target_date,
            monthly_contribution=monthly_contrib,
            is_active=True
        )
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
        AnalyticsService.invalidate_safe_spend_cache(user_id)
        return goal

    async def get_active_goals(self, db: AsyncSession, user_id: UUID) -> List[Goal]:
        result = await db.execute(
            select(Goal)
            .where(Goal.user_id == user_id)
            .where(Goal.is_active == True)
            .order_by(Goal.target_date)
        )
        return result.scalars().all()
    
    async def get_total_monthly_goal_contribution(self, db: AsyncSession, user_id: UUID) -> float:
        result = await db.execute(
            select(func.sum(Goal.monthly_contribution))
            .where(Goal.user_id == user_id)
            .where(Goal.is_active == True)
        )
        return result.scalar() or 0.0

    async def delete_goal(self, db: AsyncSession, user_id: UUID, goal_id: UUID):
        result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id))
        goal = result.scalar_one_or_none()
        if goal:
            await db.delete(goal)
            await db.commit()
            AnalyticsService.invalidate_safe_spend_cache(user_id)
