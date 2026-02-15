import uuid
from decimal import Decimal
from typing import Optional
from datetime import date
from sqlalchemy import String, ForeignKey, Numeric, Boolean, Integer, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Bill(Base):
    __tablename__ = "bills"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False)
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False)
    recurrence_day: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    category: Mapped[str] = mapped_column(String, nullable=False)
    sub_category: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="bills")

class BillExclusion(Base):
    __tablename__ = "bill_exclusions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    
    # For skipping a specific projection from a specific transaction
    source_transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("transactions.id"), nullable=True)
    
    # For permanent exclusion logic
    merchant_pattern: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    subcategory_pattern: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    
    exclusion_type: Mapped[str] = mapped_column(String)  # 'SKIP', 'PERMANENT'
    
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
