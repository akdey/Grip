from pydantic import BaseModel, Field
from uuid import UUID
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

class LedgerEntryBase(BaseModel):
    peer_name: str
    amount: Decimal
    remarks: Optional[str] = None
    date: Optional[date] = None

class LedgerEntryCreate(LedgerEntryBase):
    transaction_id: Optional[UUID] = None

class LedgerEntryResponse(LedgerEntryBase):
    id: UUID
    user_id: UUID
    transaction_id: Optional[UUID] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class PeerBalance(BaseModel):
    peer_name: str
    net_balance: Decimal
    last_activity_date: date
