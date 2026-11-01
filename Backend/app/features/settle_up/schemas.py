from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional
from datetime import date as date_type, datetime
from decimal import Decimal

class SettleUpEntryBase(BaseModel):
    peer_name: str
    amount: Decimal
    remarks: Optional[str] = None
    date: Optional[date_type] = None

    class Config:
        str_strip_whitespace = True

class SettleUpEntryCreate(SettleUpEntryBase):
    transaction_id: Optional[UUID] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class SettleUpEntryUpdate(BaseModel):
    peer_name: Optional[str] = None
    amount: Optional[Decimal] = None
    remarks: Optional[str] = None
    date: Optional[date_type] = None

    class Config:
        str_strip_whitespace = True

class SettleUpEntryResponse(SettleUpEntryBase):
    id: UUID
    user_id: UUID
    date: date_type  # Override Optional from base — DB always has a date
    transaction_id: Optional[UUID] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class PeerContactUpdate(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    auto_remind_email: Optional[bool] = None

    class Config:
        str_strip_whitespace = True

class PeerContactOut(BaseModel):
    id: UUID
    user_id: UUID
    peer_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    auto_remind_email: bool = False
    last_reminded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PeerBalance(BaseModel):
    peer_name: str
    net_balance: Decimal
    last_activity_date: date_type
    phone: Optional[str] = None
    email: Optional[str] = None
    auto_remind_email: bool = False
    last_reminded_at: Optional[datetime] = None

    class Config:
        str_strip_whitespace = True

class SendEmailReminderRequest(BaseModel):
    custom_note: Optional[str] = None
    subject: Optional[str] = None

class SendEmailReminderResponse(BaseModel):
    status: str
    message: str
    sent_to: str
    reminded_at: datetime

