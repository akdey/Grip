from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel
from decimal import Decimal
from datetime import date

class SpendTrendFrequency(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

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

class CardExposureItem(BaseModel):
    id: str
    merchant_name: str
    amount: Decimal
    transaction_date: date
    card_id: Optional[str] = None
    card_name: Optional[str] = None
    last_four_digits: Optional[str] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    status: str = "UNSETTLED"

class CardExposureSummary(BaseModel):
    card_id: Optional[str] = None
    card_name: str
    last_four_digits: Optional[str] = None
    amount: Decimal
    count: int

class FrozenFundsBreakdown(BaseModel):
    unpaid_bills: Decimal
    projected_surety: Decimal
    unbilled_cc: Decimal
    active_goals: Decimal = Decimal(0)
    total_frozen: Decimal
    obligations: List[IdentifiedObligation] = []
    card_exposure: List[CardExposureItem] = []
    card_breakdown: List[CardExposureSummary] = []

class SafeToSpendResponse(BaseModel):
    current_balance: Decimal
    frozen_funds: FrozenFundsBreakdown
    buffer_amount: Decimal
    buffer_percentage: float
    safe_to_spend: Decimal
    recommendation: str
    status: str # "success", "warning", "critical", "negative"

class LiquidityBreakdown(BaseModel):
    direct_lifestyle_expenses: Decimal = Decimal(0)
    capital_investments: Decimal = Decimal(0)
    debt_settlements: Decimal = Decimal(0)

class LiquiditySummary(BaseModel):
    total_cash_outflow: Decimal = Decimal(0)
    breakdown: LiquidityBreakdown

class AccrualBurnSummary(BaseModel):
    true_consumption_burn: Decimal = Decimal(0)
    unsettled_credit_liability: Decimal = Decimal(0)

class AssetMovement(BaseModel):
    capital_allocated_to_assets: Decimal = Decimal(0)

class MonthlySummaryResponse(BaseModel):
    period: Optional[str] = None
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    month: str
    year: int
    current_period_expense: Decimal = Decimal(0)
    prior_period_settlement: Decimal = Decimal(0)
    direct_expense: Decimal = Decimal(0)
    credit_expense: Decimal = Decimal(0)
    capital_investments: Decimal = Decimal(0)
    cash_outflow: Decimal = Decimal(0)
    gross_liquid_balance: Decimal = Decimal(0)
    cumulative_liquid_balance: Decimal = Decimal(0)
    liquidity_summary: Optional[LiquiditySummary] = None
    accrual_burn_summary: Optional[AccrualBurnSummary] = None
    asset_movement: Optional[AssetMovement] = None

class SpendTrendPoint(BaseModel):
    date: date
    amount: Decimal

class SpendTrendResponse(BaseModel):
    trends: List[SpendTrendPoint]
