import uuid
from typing import List, Optional
from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, index=True)
    icon: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    type: Mapped[str] = mapped_column(String, default="EXPENSE") # EXPENSE, INCOME, INVESTMENT
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True) # None for system categories

    sub_categories: Mapped[List["SubCategory"]] = relationship("SubCategory", back_populates="category", cascade="all, delete-orphan", lazy="selectin")

class SubCategory(Base):
    __tablename__ = "sub_categories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String)
    icon: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    type: Mapped[str] = mapped_column(String, default="EXPENSE")
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id"))
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)

    category: Mapped["Category"] = relationship("Category", back_populates="sub_categories")
