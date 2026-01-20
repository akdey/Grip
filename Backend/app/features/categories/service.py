from uuid import UUID
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, Depends
from app.features.categories.models import Category, SubCategory
from app.features.categories import schemas
from app.core.database import get_db

class CategoryService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db

    async def get_categories(self, user_id: UUID) -> List[Category]:
        # Fetch both system categories (user_id=None) and user-specific categories
        stmt = (
            select(Category)
            .where((Category.user_id == None) | (Category.user_id == user_id))
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create_category(self, user_id: UUID, data: schemas.CategoryCreate) -> Category:
        category = Category(
            name=data.name,
            icon=data.icon,
            color=data.color,
            type=data.type,
            user_id=user_id
        )
        self.db.add(category)
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def create_sub_category(self, user_id: UUID, data: schemas.SubCategoryCreate) -> SubCategory:
        sub_category = SubCategory(
            name=data.name,
            icon=data.icon,
            color=data.color,
            type=data.type,
            category_id=data.category_id,
            user_id=user_id,
            is_surety=data.is_surety
        )
        self.db.add(sub_category)
        await self.db.commit()
        await self.db.refresh(sub_category)
        return sub_category

    async def delete_category(self, user_id: UUID, category_id: UUID):
        stmt = select(Category).where(Category.id == category_id, Category.user_id == user_id)
        result = await self.db.execute(stmt)
        category = result.scalar_one_or_none()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found or you don't have permission")
        await self.db.delete(category)
        await self.db.commit()

    async def delete_sub_category(self, user_id: UUID, sub_category_id: UUID):
        stmt = select(SubCategory).where(SubCategory.id == sub_category_id, SubCategory.user_id == user_id)
        result = await self.db.execute(stmt)
        sub_category = result.scalar_one_or_none()
        if not sub_category:
            raise HTTPException(status_code=404, detail="SubCategory not found or you don't have permission")
        await self.db.delete(sub_category)
        await self.db.commit()
