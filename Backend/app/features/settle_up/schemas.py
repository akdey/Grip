from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

class SettleUpEntryBase(BaseModel):
    peer_name: str
    amount: Decimal
    remarks: Optional[str] = None
    date: Optional[date] = None

class SettleUpEntryCreate(SettleUpEntryBase):
    transaction_id: Optional[UUID] = None

class SettleUpEntryUpdate(BaseModel):
    peer_name: Optional[str] = None
    amount: Optional[Decimal] = None
    remarks: Optional[str] = None
    date: Optional[date] = None

class SettleUpEntryResponse(SettleUpEntryBase):
    id: UUID
    user_id: UUID
    date: date  # Override Optional from base — DB always has a date
    transaction_id: Optional[UUID] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class PeerBalance(BaseModel):
    peer_name: str
    net_balance: Decimal
    last_activity_date: date
