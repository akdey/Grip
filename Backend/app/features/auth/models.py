import uuid
from sqlalchemy import String, Boolean, DateTime, JSON, ForeignKey, Integer, LargeBinary
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String, nullable=True)
    hashed_password: Mapped[str] = mapped_column(String)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    fcm_token: Mapped[str] = mapped_column(String, nullable=True)
    gmail_credentials: Mapped[dict] = mapped_column(JSON, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    verification_code: Mapped[str] = mapped_column(String, nullable=True)
    verification_code_expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)
    
    credit_cards: Mapped[list["CreditCard"]] = relationship("CreditCard", back_populates="user")
    bills: Mapped[list["Bill"]] = relationship("Bill", back_populates="user")
    passkeys: Mapped[list["PasskeyCredential"]] = relationship("PasskeyCredential", back_populates="user", cascade="all, delete-orphan")


class PasskeyCredential(Base):
    __tablename__ = "passkey_credentials"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # base64url credential_id
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    public_key: Mapped[bytes] = mapped_column(LargeBinary)
    sign_count: Mapped[int] = mapped_column(Integer, default=0)
    device_name: Mapped[str] = mapped_column(String, default="Biometric Sensor")
    transports: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_used_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="passkeys")


# Ensure related models are imported to resolve SQLAlchemy mapper relationships
try:
    import app.features.transactions.models  # noqa: F401
    import app.features.credit_cards.models  # noqa: F401
    import app.features.bills.models  # noqa: F401
except Exception:
    pass
