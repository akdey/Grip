from datetime import datetime
from uuid import UUID
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base

class SyncLog(Base):
    __tablename__ = "sync_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String, default="IN_PROGRESS") # IN_PROGRESS, SUCCESS, FAILED
    records_processed: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    trigger_source: Mapped[str] = mapped_column(String) # WEBHOOK, MANUAL
    
    # Store the historyId used for this sync to know where to start next time
    history_id_used: Mapped[str] = mapped_column(String, nullable=True) 

    # Relationship to user if needed, or just ID
