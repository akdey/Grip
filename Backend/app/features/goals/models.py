from datetime import date
from uuid import UUID
from sqlalchemy import Column, String, Float, Date, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.core.database import Base

class Goal(Base):
    __tablename__ = "goals"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=func.uuid_generate_v4())
    user_id = Column(PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    name = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    target_date = Column(Date, nullable=False)
    
    # The amount we need to "freeze" monthly to hit this goal
    monthly_contribution = Column(Float, nullable=False, default=0.0)
    
    # Track how much has been "saved" logically (optional, for tracking logic)
    current_saved = Column(Float, default=0.0)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    
    user = relationship("User", backref="goals")
