from typing import Dict, List, Optional
from pydantic import BaseModel
from decimal import Decimal
from datetime import date

class CategoryVariance(BaseModel):
    current: Decimal
    previous: Decimal
    variance_amount: Decimal
    variance_percentage: float
    trend: str # "up", "down", "stable"

class VarianceAnalysis(BaseModel):
    current_month_total: Decimal
    last_month_total: Decimal
    variance_amount: Decimal
    variance_percentage: float
    category_breakdown: Dict[str, CategoryVariance]

class IdentifiedObligation(BaseModel):
    id: str
    title: str
    amount: Decimal
    due_date: date
    type: str # "BILL", "SIP", "SURETY_TXN", "GOAL"
    status: str # "OVERDUE", "PENDING", "PROJECTED"
    category: Optional[str] = None
    sub_category: Optional[str] = None
    source_id: Optional[str] = None

class FrozenFundsBreakdown(BaseModel):
    unpaid_bills: Decimal
    projected_surety: Decimal
    unbilled_cc: Decimal
    active_goals: Decimal = Decimal(0)
    total_frozen: Decimal
    obligations: List[IdentifiedObligation] = []

class SafeToSpendResponse(BaseModel):
    current_balance: Decimal
    frozen_funds: FrozenFundsBreakdown
    buffer_amount: Decimal
    buffer_percentage: float
    safe_to_spend: Decimal
    recommendation: str
    status: str # "success", "warning", "critical", "negative"

class MonthlySummaryResponse(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    month: str
    year: int
    current_period_expense: Decimal = Decimal(0)
    prior_period_settlement: Decimal = Decimal(0)
