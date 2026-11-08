import uuid
from decimal import Decimal
from datetime import datetime
from typing import Optional
from sqlalchemy import String, ForeignKey, Numeric, Text, DateTime, Index, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.features.auth.models import User
from app.features.transactions.models import Transaction

class AnomalyFlag(Base):
    __tablename__ = "anomaly_flags"
    __table_args__ = (
        Index("ix_anomaly_flags_user_active", "user_id", "is_dismissed"),
        Index("ix_anomaly_flags_user_type_dedup", "user_id", "dedup_key", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    # anomaly_type: "amount_spike" | "category_burn" | "near_duplicate" | "recurring_drift" | "new_merchant_high" | "settle_up_aging"
    anomaly_type: Mapped[str] = mapped_column(String(50), index=True)
    # severity: "high" | "medium" | "low"
    severity: Mapped[str] = mapped_column(String(20), default="medium")

    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)

    transaction_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("transactions.id", ondelete="SET NULL"), 
        nullable=True, 
        index=True
    )

    merchant_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    expected_range: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Unique string preventing duplicate alert generation across runs
    dedup_key: Mapped[str] = mapped_column(String(255), index=True)

    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    dismissed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    user: Mapped["User"] = relationship("User")
    transaction: Mapped[Optional["Transaction"]] = relationship("Transaction")
