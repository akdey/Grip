from pydantic import BaseModel
from datetime import date
from typing import Optional
from uuid import UUID

class GoalBase(BaseModel):
    name: str # string -> str
    target_amount: float
    target_date: date

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
    message: str
