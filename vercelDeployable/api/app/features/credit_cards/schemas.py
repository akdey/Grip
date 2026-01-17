from typing import Optional
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field


class CreditCardBase(BaseModel):
    card_name: str = Field(..., description="User-defined name for the card (e.g., 'HDFC Regalia')")
    last_four_digits: Optional[str] = Field(None, max_length=4, description="Last 4 digits of card number")
    statement_date: int = Field(..., ge=1, le=31, description="Day of month when statement is generated")
    payment_due_date: int = Field(..., ge=1, le=31, description="Day of month when payment is due")
    credit_limit: Optional[Decimal] = Field(None, description="Credit limit of the card")


class CreditCardCreate(CreditCardBase):
    pass


class CreditCardUpdate(BaseModel):
    card_name: Optional[str] = None
    last_four_digits: Optional[str] = Field(None, max_length=4)
    statement_date: Optional[int] = Field(None, ge=1, le=31)
    payment_due_date: Optional[int] = Field(None, ge=1, le=31)
    credit_limit: Optional[Decimal] = None
    is_active: Optional[bool] = None


class CreditCardResponse(CreditCardBase):
    id: UUID
    user_id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class CreditCardCycleInfo(BaseModel):
    card_id: UUID
    card_name: str
    cycle_start: date
    cycle_end: date
    next_statement_date: date
    days_until_statement: int
    unbilled_amount: Decimal
    credit_limit: Optional[Decimal]
    utilization_percentage: Optional[float]


class CreditCardWithCycleInfo(CreditCardResponse):
    cycle_info: CreditCardCycleInfo
