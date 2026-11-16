from pydantic import BaseModel
from datetime import date
from typing import Optional
from uuid import UUID

class GoalBase(BaseModel):
    name: str # string -> str
    target_amount: float
    target_date: date
    custom_expected_income: Optional[float] = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    target_date: Optional[date] = None
    is_active: Optional[bool] = None

class GoalResponse(GoalBase):
    id: UUID
    user_id: UUID
    monthly_contribution: float
    current_saved: float
    is_active: bool
    
    class Config:
        from_attributes = True

class FeasibilityCheck(BaseModel):
    is_feasible: bool
    required_monthly_savings: float
    available_monthly_liquidity: float
    projected_monthly_surplus: float = 0.0
    projected_total_savings: float = 0.0
    current_cycle_freeze: float = 0.0
    next_cycle_contribution: float = 0.0
    days_remaining: int = 0
    daily_saving_needed: float = 0.0
    detected_income: float = 0.0
    detected_payday_day: int = 1
    salary_cycles_count: int = 0
    monthly_obligations_burn: float = 0.0
    message: str
    suggested_target_date: Optional[date] = None
    suggested_target_amount: Optional[float] = None
    suggested_cycles_needed: Optional[int] = None
