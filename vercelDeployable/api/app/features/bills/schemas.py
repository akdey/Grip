from typing import Optional
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, Field
from app.features.transactions.enums import Category, SubCategory


class BillBase(BaseModel):
    title: str = Field(..., description="Bill title (e.g., 'Rent', 'Electricity')")
    amount: Decimal = Field(..., description="Bill amount")
    due_date: date = Field(..., description="Due date for the bill")
    is_recurring: bool = Field(default=False, description="Whether this is a recurring bill")
    recurrence_day: Optional[int] = Field(None, ge=1, le=31, description="Day of month for recurring bills")
    category: Category
    sub_category: SubCategory


class BillCreate(BillBase):
    pass


class BillUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[Decimal] = None
    due_date: Optional[date] = None
    is_recurring: Optional[bool] = None
    recurrence_day: Optional[int] = Field(None, ge=1, le=31)
    category: Optional[Category] = None
    sub_category: Optional[SubCategory] = None


class BillResponse(BillBase):
    id: UUID
    user_id: UUID
    is_paid: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MarkPaidRequest(BaseModel):
    paid: bool = True


class UpcomingBillsResponse(BaseModel):
    upcoming_bills: list[BillResponse]
    total_amount: Decimal
    count: int
