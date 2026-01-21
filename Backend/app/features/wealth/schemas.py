
from pydantic import BaseModel, Field, field_validator
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
    
    @field_validator('ticker_symbol', mode='before')
    @classmethod
    def convert_to_string(cls, v):
        if v is None:
            return None
        return str(v)
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

# CAMS Import Schemas
class CAMSTransaction(BaseModel):
    transaction_date: date
    scheme_name: str
    folio_number: Optional[str] = None
    amount: float
    units: float
    nav: float
    transaction_type: str  # "Purchase", "Redemption", "Dividend", etc.

class CAMSImportRequest(BaseModel):
    transactions: List[CAMSTransaction]
    auto_create_holdings: bool = True
    detect_sip_patterns: bool = True

class CAMSImportResponse(BaseModel):
    holdings_created: int
    holdings_updated: int
    transactions_processed: int
    sip_patterns_detected: int
    errors: List[str] = []

# SIP Date Analysis Schemas
class SIPDatePerformance(BaseModel):
    sip_date: int  # Day of month (1-31)
    total_invested: float
    current_value: float
    absolute_return: float
    return_percentage: float
    xirr: Optional[float] = None

class SIPDateAnalysisResponse(BaseModel):
    holding_id: UUID
    holding_name: str
    user_sip_date: int
    user_performance: SIPDatePerformance
    alternatives: dict[int, SIPDatePerformance]  # {date: performance}
    best_alternative: dict  # {"date": int, "performance": SIPDatePerformance, "improvement": float}
    insight: str
    historical_pattern: Optional[str] = None

class SimulateInvestmentRequest(BaseModel):
    scheme_code: str
    amount: float
    date: date

class SimulateInvestmentResponse(BaseModel):
    scheme_code: str
    invested_date: date
    invested_amount: float
    start_nav: float
    current_nav: float
    units_allotted: float
    current_value: float
    absolute_return: float
    return_percentage: float

