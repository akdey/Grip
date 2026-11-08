from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

class AnomalyFlagResponse(BaseModel):
    id: UUID
    anomaly_type: str
    severity: str
    title: str
    description: str
    transaction_id: Optional[UUID] = None
    merchant_name: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    expected_range: Optional[str] = None
    is_dismissed: bool
    dismissed_at: Optional[datetime] = None
    detected_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AnomalyListResponse(BaseModel):
    active_count: int
    high_severity_count: int
    flags: List[AnomalyFlagResponse]

class AnomalyScanResponse(BaseModel):
    new_anomalies_found: int
    total_active: int
    flags: List[AnomalyFlagResponse]
