import logging
from uuid import UUID
from datetime import date
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.features.goals.models import Goal
from app.features.goals.schemas import GoalCreate, FeasibilityCheck
from app.features.analytics.service import AnalyticsService

logger = logging.getLogger(__name__)

class GoalService:
    def __init__(self):
        self.analytics_service = AnalyticsService()

    def _calculate_monthly_contribution(self, target_amount: float, target_date: date) -> float:
        today = date.today()
        if target_date <= today:
            return target_amount # If date is passed or today, we need it all now!
        
        # Calculate roughly months remaining
        # We use a simple approximation: (YearDiff * 12) + MonthDiff
        # If day is current day or later, full month counts? Let's keep it simple.
        months_remaining = (target_date.year - today.year) * 12 + (target_date.month - today.month)
        
        # If less than 1 month (e.g. same month later date), treat as 1 month
        months_remaining = max(1, months_remaining)
        
        return round(target_amount / months_remaining, 2)

    async def check_feasibility(self, db: AsyncSession, user_id: UUID, goal: GoalCreate) -> FeasibilityCheck:
        required_savings = self._calculate_monthly_contribution(goal.target_amount, goal.target_date)
        
        # Get Average Monthly Summary (Liquidity)
        # We can use the 'get_monthly_summary' but logic needs to be predictive.
        # Let's simplify: Take avg income - avg expense from last 3 months?
        # Or easier: Use current safe_to_spend BEFORE goal deduction as 'Available'.
        
        # Actually proper way:
        # Liquidity = Avg Income - (Avg Expenses + Avg Surety + Avg Investments)
        # This seems complex to calculate "Active Liquidity" on the fly accurately without detailed history.
        # PROXY: Use 'Safe to Spend' of current month as a proxy for "Monthly Free Cashflow"? 
        # No, Safe to Spend is balance based.
        
        # Better: Use (Income - Expense) avg over last 3 months.
        # But for MVP speed: Let's assume user has the safe_to_spend capacity available monthly. 
        # Wait, safe_to_spend is CURRENT balance.
        
        # Let's use AnalyticsService to get a 'monthly_free_flow' estimate.
        # We can reuse 'calculate_burden' logic.
        
        # Let's fetch last month's summary as a baseline.
        # TODO: Ideally fetch avg of last 3 months.
        last_month = await self.analytics_service.get_monthly_summary(db, user_id) 
        # Note: This gets current month. 
        
        # Estimate: Income - (Surety + Avg Discretionary).
        # Let's be conservative: Available = Total Income - Total Expense (Last Month)
        # If last month was negative, we assume 0 available?
        
        # Alternative: Just return the REQUIRED amount and a message based on SafeToSpend.
        # If Required > SafeToSpend(current), it's definitely risky for NOW.
        
        safe_response = await self.analytics_service.calculate_safe_to_spend_amount(db, user_id)
        current_safe_capacity = float(safe_response.safe_to_spend)
        
        is_feasible = current_safe_capacity >= required_savings
        
        msg = "✅ Plan looks solid." if is_feasible else "⚠️ This requires more than your current safe buffer."
        
        return FeasibilityCheck(
            is_feasible=is_feasible,
            required_monthly_savings=required_savings,
            available_monthly_liquidity=current_safe_capacity,
            message=msg
        )

    async def create_goal(self, db: AsyncSession, user_id: UUID, goal_data: GoalCreate) -> Goal:
        monthly_contrib = self._calculate_monthly_contribution(goal_data.target_amount, goal_data.target_date)
        
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
