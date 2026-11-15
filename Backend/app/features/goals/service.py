import logging
import calendar
from uuid import UUID
from datetime import date, timedelta
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_, and_

from app.features.goals.models import Goal
from app.features.goals.schemas import GoalCreate, FeasibilityCheck
from app.features.analytics.service import AnalyticsService
from app.features.transactions.models import Transaction, AccountType

logger = logging.getLogger(__name__)

class GoalService:
    def __init__(self):
        self.analytics_service = AnalyticsService()

    def _calculate_timeline(self, target_amount: float, target_date: date) -> tuple[int, float, float, float]:
        today = date.today()
        days_remaining = (target_date - today).days
        if days_remaining <= 0:
            return (0, 1.0, target_amount, target_amount)
        
        months_remaining = max(1.0, round(days_remaining / 30.4, 1))
        required_monthly = round(target_amount / months_remaining, 2)
        daily_saving = round(target_amount / days_remaining, 2)
        return (days_remaining, months_remaining, required_monthly, daily_saving)

    async def _get_historical_surplus(self, db: AsyncSession, user_id: UUID) -> tuple[float, float, float]:
        today = date.today()
        ninety_days_ago = today - timedelta(days=90)

        # 1. Total liquid income in last 90 days
        income_stmt = (
            select(func.sum(Transaction.amount))
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
        total_income_90d = float(income_res.scalar() or 0.0)

        # Check earliest transaction to know months active
        earliest_stmt = select(func.min(Transaction.transaction_date)).where(Transaction.user_id == user_id)
        earliest_date = (await db.execute(earliest_stmt)).scalar()
        if earliest_date:
            days_active = max(1, (today - earliest_date).days)
            months_active = max(1.0, min(3.0, days_active / 30.0))
        else:
            months_active = 1.0

        avg_monthly_income = total_income_90d / months_active

        # 2. Get real fixed obligations and living buffer from AnalyticsService
        safe_resp = await self.analytics_service.calculate_safe_to_spend_amount(db, user_id)
        fixed_obligations = float(
            safe_resp.frozen_funds.unpaid_bills +
            safe_resp.frozen_funds.projected_surety +
            safe_resp.frozen_funds.unbilled_cc
        )

        # Discretionary daily rate scaled to 30 days
        _, days_in_month = calendar.monthrange(today.year, today.month)
        days_left_in_month = max(1, days_in_month - today.day + 1)
        daily_discretionary = float(safe_resp.buffer_amount) / days_left_in_month
        monthly_discretionary = daily_discretionary * 30.0

        total_monthly_burn = fixed_obligations + monthly_discretionary
        net_monthly_surplus = max(0.0, avg_monthly_income - total_monthly_burn)
        current_safe = float(safe_resp.safe_to_spend)

        return (avg_monthly_income, net_monthly_surplus, current_safe)

    def _calculate_monthly_contribution(self, target_amount: float, target_date: date) -> float:
        _, months_remaining, required_monthly, _ = self._calculate_timeline(target_amount, target_date)
        return required_monthly

    async def check_feasibility(self, db: AsyncSession, user_id: UUID, goal: GoalCreate) -> FeasibilityCheck:
        days_remaining, months_remaining, required_monthly, daily_needed = self._calculate_timeline(
            goal.target_amount, goal.target_date
        )
        
        avg_income, monthly_surplus, current_safe = await self._get_historical_surplus(db, user_id)

        # Pacing calculation: Don't bankrupt the current cycle!
        if days_remaining <= 30:
            # Short-term (target is within the current month/cycle)
            current_freeze = min(goal.target_amount, current_safe)
            next_cycle_contrib = max(0.0, goal.target_amount - current_freeze)
            projected_total = current_safe
            is_feasible = current_safe >= goal.target_amount
        else:
            # Multi-cycle (spans across future income/salary cycles)
            # Cap current cycle freeze so user preserves at least 50% of current safe-to-spend for living expenses
            safe_cap = max(0.0, current_safe * 0.5)
            current_freeze = min(required_monthly, safe_cap)
            next_cycle_contrib = max(0.0, goal.target_amount - current_freeze)
            
            # Future income cycles contribute from their projected monthly surplus (income - bills - living)
            future_cycles = max(0.0, months_remaining - 0.5)
            projected_future_savings = future_cycles * monthly_surplus
            projected_total = current_safe + projected_future_savings
            
            # Feasible if current safe buffer + projected future surplus covers target
            is_feasible = (projected_total >= goal.target_amount) or (current_safe >= goal.target_amount)

        current_freeze = round(current_freeze, 2)
        next_cycle_contrib = round(next_cycle_contrib, 2)
        projected_total = round(projected_total, 2)

        # Diagnostic explanation message
        if is_feasible:
            if days_remaining > 30 and next_cycle_contrib > 0:
                cushion = max(0.0, current_safe - current_freeze)
                msg = (
                    f"✅ Plan looks solid! Target ₹{goal.target_amount:,.0f} across {days_remaining} days. "
                    f"Freezing ₹{current_freeze:,.0f} now (leaving ₹{cushion:,.0f} safe cushion till next income). "
                    f"Remaining ₹{next_cycle_contrib:,.0f} will be funded from upcoming income surplus (~₹{monthly_surplus:,.0f}/mo after bills & living)."
                )
            else:
                msg = f"✅ Plan looks solid! ₹{goal.target_amount:,.0f} is fully covered by your current safe buffer."
        else:
            shortfall = max(0.0, goal.target_amount - projected_total)
            msg = (
                f"⚠️ Target is tight. Over {days_remaining} days, your projected savings capacity is ₹{projected_total:,.0f} "
                f"(shortfall of ₹{shortfall:,.0f}). After obligations and living expenses, monthly surplus is ~₹{monthly_surplus:,.0f}. "
                f"To hit ₹{goal.target_amount:,.0f}, you need ₹{daily_needed:,.0f}/day."
            )

        return FeasibilityCheck(
            is_feasible=is_feasible,
            required_monthly_savings=required_monthly,
            available_monthly_liquidity=current_safe,
            projected_monthly_surplus=round(monthly_surplus, 2),
            projected_total_savings=projected_total,
            current_cycle_freeze=current_freeze,
            next_cycle_contribution=next_cycle_contrib,
            days_remaining=days_remaining,
            daily_saving_needed=daily_needed,
            message=msg
        )

    async def create_goal(self, db: AsyncSession, user_id: UUID, goal_data: GoalCreate) -> Goal:
        days_remaining, months_remaining, required_monthly, _ = self._calculate_timeline(
            goal_data.target_amount, goal_data.target_date
        )
        _, _, current_safe = await self._get_historical_surplus(db, user_id)
        
        # Calculate safe current freeze so we don't starve the current cycle
        if days_remaining <= 30:
            monthly_contrib = min(goal_data.target_amount, current_safe)
        else:
            safe_cap = max(0.0, current_safe * 0.5)
            monthly_contrib = min(required_monthly, safe_cap)
            
        # Ensure at least 0.0, and if safe_cap is 0, default to required so goal is actively tracked
        if monthly_contrib <= 0 and current_safe <= 0:
            monthly_contrib = required_monthly

        monthly_contrib = round(monthly_contrib, 2)
        
        goal = Goal(
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
