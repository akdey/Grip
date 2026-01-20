
from enum import Enum
import uuid
from typing import Optional
from datetime import datetime, date
from sqlalchemy import String, Float, DateTime, ForeignKey, Integer, Date, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base

class AssetType(str, Enum):
    SIP = "SIP"
    MUTUAL_FUND = "MUTUAL_FUND"
    STOCK = "STOCK"
    FD = "FD"
    RD = "RD"
    PF = "PF"
    GRATUITY = "GRATUITY"
    GOLD = "GOLD"
    REAL_ESTATE = "REAL_ESTATE"
    OTHER = "OTHER"

class InvestmentHolding(Base):
    __tablename__ = "investment_holdings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    
    name: Mapped[str] = mapped_column(String, index=True)
    asset_type: Mapped[AssetType] = mapped_column(String)  # Stored as string in DB
    
    # Market linked details
    ticker_symbol: Mapped[Optional[str]] = mapped_column(String, nullable=True) # e.g. "RELIANCE.NS" or MF Scheme Code
    api_source: Mapped[Optional[str]] = mapped_column(String, nullable=True) # "YFINANCE", "MFAPI"
    
    # Fixed income details
    interest_rate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    maturity_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    
    # Computed/Cached fields
    current_value: Mapped[float] = mapped_column(Float, default=0.0)
    total_invested: Mapped[float] = mapped_column(Float, default=0.0)
    xirr: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    last_updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    snapshots: Mapped[list["InvestmentSnapshot"]] = relationship("InvestmentSnapshot", back_populates="holding", cascade="all, delete-orphan")
    mapping_rules: Mapped[list["InvestmentMappingRule"]] = relationship("InvestmentMappingRule", back_populates="holding", cascade="all, delete-orphan")

class InvestmentSnapshot(Base):
    __tablename__ = "investment_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    holding_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("investment_holdings.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id")) # Denormalized for query perf
    
    captured_at: Mapped[date] = mapped_column(Date, index=True)
    
    units_held: Mapped[float] = mapped_column(Float, default=0.0)
    price_per_unit: Mapped[float] = mapped_column(Float, default=0.0)
    total_value: Mapped[float] = mapped_column(Float, default=0.0)
    
    amount_invested_delta: Mapped[float] = mapped_column(Float, default=0.0) # For flow tracking (buy/sell amount on this day)
    
    is_projected: Mapped[bool] = mapped_column(Boolean, default=False) # For Prophet forecasts

    holding: Mapped["InvestmentHolding"] = relationship("InvestmentHolding", back_populates="snapshots")

class InvestmentMappingRule(Base):
    __tablename__ = "investment_mapping_rules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), index=True)
    holding_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("investment_holdings.id"))
    
    pattern: Mapped[str] = mapped_column(String) # Regex or string to match in email/narration
    match_type: Mapped[str] = mapped_column(String, default="CONTAINS") # CONTAINS, REGEX, EXACT
    
    holding: Mapped["InvestmentHolding"] = relationship("InvestmentHolding", back_populates="mapping_rules")

