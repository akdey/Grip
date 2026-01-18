import uuid
from decimal import Decimal
from datetime import date
from typing import List, Optional
from sqlalchemy import String, ForeignKey, Numeric, ARRAY, Text, DateTime, Boolean, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.features.auth.models import User

# Core status constants
class TransactionStatus:
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"

class AccountType:
    SAVINGS = "SAVINGS"
    CREDIT_CARD = "CREDIT_CARD"
    CASH = "CASH"

class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    raw_content_hash: Mapped[str] = mapped_column(String, unique=True, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    currency: Mapped[str] = mapped_column(String, default="INR")
    merchant_name: Mapped[str] = mapped_column(String, nullable=True)
    category: Mapped[str] = mapped_column(String, index=True)
    sub_category: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default=TransactionStatus.PENDING)
    account_type: Mapped[str] = mapped_column(String, default=AccountType.SAVINGS, index=True)
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # New fields for hybrid manual-first system
    is_surety: Mapped[bool] = mapped_column(Boolean, default=False)
    credit_card_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("credit_cards.id"), nullable=True)
    transaction_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    is_manual: Mapped[bool] = mapped_column(Boolean, default=False)
    is_settled: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped["User"] = relationship("User")
    credit_card: Mapped[Optional["CreditCard"]] = relationship("CreditCard", back_populates="transactions")

class MerchantMapping(Base):
    __tablename__ = "merchant_mappings"

    raw_merchant: Mapped[str] = mapped_column(String, primary_key=True) # Assuming raw_merchant is unique enough or use UUID
    display_name: Mapped[str] = mapped_column(String)
    default_category: Mapped[str] = mapped_column(String)
    default_sub_category: Mapped[str] = mapped_column(String)
