import uuid
from decimal import Decimal
from datetime import date
from typing import Optional
from sqlalchemy import String, ForeignKey, Numeric, Text, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.features.auth.models import User
from app.features.transactions.models import Transaction

class LedgerEntry(Base):
    __tablename__ = "settle_up_entries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    
    # Who the transaction is with (serves as the grouping key)
    peer_name: Mapped[str] = mapped_column(String, index=True) 
    
    # Positive amount = They owe you (You lent them money)
    # Negative amount = You owe them (You borrowed money, or they repaid a loan)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    
    # Loose coupling to the main transaction, if it originated from a bank sync/manual entry
    transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("transactions.id", ondelete="CASCADE"), nullable=True)
    
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date: Mapped[date] = mapped_column(Date, default=date.today)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User")
    transaction: Mapped[Optional["Transaction"]] = relationship("Transaction")
