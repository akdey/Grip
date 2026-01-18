from typing import List, Optional
from pydantic import BaseModel
from decimal import Decimal

class CategoryForecast(BaseModel):
    category: str
    predicted_amount: Decimal
    reason: str

class ForecastResponse(BaseModel):
    amount: Decimal
    reason: str
    time_frame: str
    confidence: str = "high"
    breakdown: List[CategoryForecast] = []
