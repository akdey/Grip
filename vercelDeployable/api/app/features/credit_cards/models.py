import uuid
from decimal import Decimal
from typing import Optional
from sqlalchemy import String, ForeignKey, Numeric, Boolean, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base


class CreditCard(Base):
    __tablename__ = "credit_cards"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    card_name: Mapped[str] = mapped_column(String, nullable=False)
    last_four_digits: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    statement_date: Mapped[int] = mapped_column(Integer, nullable=False)
    payment_due_date: Mapped[int] = mapped_column(Integer, nullable=False)
    credit_limit: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="credit_cards")
    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="credit_card")
