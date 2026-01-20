
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from uuid import UUID
from enum import Enum

class AssetType(str, Enum):
    SIP = "SIP"
    MUTUAL_FUND = "MUTUAL_FUND"
    STOCK = "STOCK"
    FD = "FD"
    RD = "RD"
    PF = "PF"
    GRATUITY = "GRATUITY"
    GOLD = "GOLD"
    REAL_ESTATE = "REAL_ESTATE"
    OTHER = "OTHER"

class InvestmentHoldingBase(BaseModel):
    name: str
    asset_type: AssetType
    ticker_symbol: Optional[str] = None
    api_source: Optional[str] = None
    interest_rate: Optional[float] = None
    maturity_date: Optional[date] = None

class InvestmentHoldingCreate(InvestmentHoldingBase):
    # For onboarding with existing holdings
    current_units: Optional[float] = None
    total_invested: Optional[float] = None
    investment_start_date: Optional[date] = None
    investment_type: Optional[str] = None  # "SIP" or "LUMPSUM"

class InvestmentHoldingUpdate(InvestmentHoldingBase):
    pass

class InvestmentHoldingOut(InvestmentHoldingBase):
    id: UUID
    user_id: UUID
    current_value: float
    total_invested: float
    xirr: Optional[float] = None
    last_updated_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class InvestmentSnapshotBase(BaseModel):
    captured_at: date
    units_held: float
    price_per_unit: float
    total_value: float
    amount_invested_delta: float

class InvestmentSnapshotOut(InvestmentSnapshotBase):
    id: UUID
    holding_id: UUID
    is_projected: bool = False

    class Config:
        from_attributes = True

class InvestmentMappingRuleCreate(BaseModel):
    holding_id: UUID
    pattern: str
    match_type: str = "CONTAINS"

class InvestmentMappingRuleOut(InvestmentMappingRuleCreate):
    id: UUID
    user_id: UUID
    
    class Config:
        from_attributes = True

class WealthDashboardSummary(BaseModel):
    total_wealth: float
    total_invested: float
    overall_xirr: Optional[float]
    equity_allocation: float # Percentage
    debt_allocation: float # Percentage
    liquid_allocation: float # Percentage
    holdings: List[InvestmentHoldingOut]

class MapTransactionRequest(BaseModel):
    transaction_id: UUID
    holding_id: UUID
    create_rule: bool = True

class ForecastRequest(BaseModel):
    years: int = 10
    monthly_investment: float = 0.0
    expected_return_rate: Optional[float] = None # Override for simple projection if needed

class ForecastPoint(BaseModel):
    date: date
    yhat: float
    yhat_lower: float
    yhat_upper: float

class ForecastResponse(BaseModel):
    history: List[ForecastPoint] = []
    forecast: List[ForecastPoint]
    summary_text: str

class InvestmentHoldingDetail(InvestmentHoldingOut):
    snapshots: List[InvestmentSnapshotOut]

