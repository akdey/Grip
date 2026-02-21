from typing import List, Optional
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel
from typing import Literal

# Core status constants for validation
TransactionStatus = Literal["PENDING", "VERIFIED", "REJECTED"]
AccountType = Literal["SAVINGS", "CREDIT_CARD", "CASH"]

class TransactionBase(BaseModel):
    amount: Decimal
    currency: str = "INR"
    merchant_name: Optional[str] = None
    category: Optional[str] = "Uncategorized"
    sub_category: Optional[str] = "Uncategorized"
    status: TransactionStatus = "PENDING"
    account_type: AccountType = "SAVINGS"
    remarks: Optional[str] = None
    tags: Optional[List[str]] = []

class TransactionCreate(TransactionBase):
    raw_content_hash: str
    category: str
    sub_category: str # Enforce required on creation but not on read

class ManualTransactionCreate(BaseModel):
    amount: Decimal
    currency: str = "INR"
    merchant_name: str
    category: str
    sub_category: str
    account_type: AccountType = "SAVINGS"
    credit_card_id: Optional[UUID] = None
    transaction_date: datetime
    is_surety: bool = False
    remarks: Optional[str] = None
    tags: Optional[List[str]] = []

class TransactionUpdate(BaseModel):
    # Used for verification/updates
    category: Optional[str] = None
    sub_category: Optional[str] = None
    merchant_name: Optional[str] = None
    status: Optional[TransactionStatus] = None
    remarks: Optional[str] = None
    tags: Optional[List[str]] = []

class TransactionResponse(TransactionBase):
    id: UUID
    user_id: UUID
    raw_content_hash: Optional[str] = None
    created_at: datetime
    
    transaction_date: Optional[date] = None
    is_manual: bool = False
    is_surety: bool = False
    is_settled: bool = False
    credit_card_id: Optional[UUID] = None
    
    category_icon: Optional[str] = None
    sub_category_icon: Optional[str] = None
    category_color: Optional[str] = None
    sub_category_color: Optional[str] = None

    class Config:
        from_attributes = True

class VerificationRequest(BaseModel):
    category: str
    sub_category: str
    merchant_name: str # Confirmed merchant name to save to mapping
    approved: bool # If False -> REJECTED
    tags: Optional[List[str]] = []
    remarks: Optional[str] = None

class CategoriesResponse(BaseModel):
    categories: dict[str, list[str]]
