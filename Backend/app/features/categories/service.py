from uuid import UUID
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload, with_loader_criteria
from fastapi import HTTPException, Depends
from app.features.categories.models import Category, SubCategory
from app.features.categories import schemas
from app.core.database import get_db

import time

class CategoryService:
    _cache = None
    _cache_time = 0
    CACHE_TTL = 3600  # 1 hour

    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db

    async def get_cached_categories(self, user_id: UUID) -> List[Category]:
        """Get categories with a simple memory cache to save DB round-trips."""
        now = time.time()
        # Note: In a multi-user environment, we'd need a per-user cache key
        # but since system categories are shared, we cache those globally.
        if CategoryService._cache is None or (now - CategoryService._cache_time) > self.CACHE_TTL:
            CategoryService._cache = await self.get_categories(user_id)
            CategoryService._cache_time = now
        return CategoryService._cache

    async def get_categories(self, user_id: UUID) -> List[Category]:
        # Fetch both system categories (user_id=None) and user-specific categories
        # Use contains_eager with explicit join to fetch everything in a SINGLE round-trip
        from sqlalchemy.orm import contains_eager
        stmt = (
            select(Category)
            .outerjoin(Category.sub_categories)
            .where((Category.user_id == None) | (Category.user_id == user_id))
            .where((SubCategory.user_id == None) | (SubCategory.user_id == user_id))
            .options(contains_eager(Category.sub_categories))
        )
        result = await self.db.execute(stmt)
        # unique() is required when using eager loading on collections
        return result.unique().scalars().all()

    @classmethod
    def invalidate_cache(cls):
        """Force the cache to refresh on the next request."""
        cls._cache = None
        cls._cache_time = 0

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
        self.invalidate_cache()
        return category

    async def create_sub_category(self, user_id: UUID, data: schemas.SubCategoryCreate) -> SubCategory:
        # Auto-inherit color from parent category if not provided
        color = data.color
        if not color:
            stmt = select(Category.color).where(Category.id == data.category_id)
            result = await self.db.execute(stmt)
            color = result.scalar()

        sub_category = SubCategory(
            name=data.name,
            icon=data.icon,
            color=color,
            type=data.type,
            category_id=data.category_id,
            user_id=user_id,
            is_surety=data.is_surety
        )
        self.db.add(sub_category)
        await self.db.commit()
        self.invalidate_cache()
        return sub_category

    async def delete_category(self, user_id: UUID, category_id: UUID):
        stmt = select(Category).where(Category.id == category_id, Category.user_id == user_id)
        result = await self.db.execute(stmt)
        category = result.scalar_one_or_none()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found or you don't have permission")
        await self.db.delete(category)
        await self.db.commit()
        self.invalidate_cache()

    async def delete_sub_category(self, user_id: UUID, sub_category_id: UUID):
        stmt = select(SubCategory).where(SubCategory.id == sub_category_id, SubCategory.user_id == user_id)
        result = await self.db.execute(stmt)
        sub_category = result.scalar_one_or_none()
        if not sub_category:
            raise HTTPException(status_code=404, detail="SubCategory not found or you don't have permission")
        await self.db.delete(sub_category)
        await self.db.commit()
        self.invalidate_cache()

    async def update_category(self, user_id: UUID, category_id: UUID, data: schemas.CategoryUpdate) -> Category:
        stmt = select(Category).where(Category.id == category_id, Category.user_id == user_id)
        result = await self.db.execute(stmt)
        category = result.scalar_one_or_none()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found or you don't have permission")
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(category, key, value)
            
        await self.db.commit()
        await self.db.refresh(category)
        self.invalidate_cache()
        return category

    async def update_sub_category(self, user_id: UUID, sub_category_id: UUID, data: schemas.SubCategoryUpdate) -> SubCategory:
        stmt = select(SubCategory).where(SubCategory.id == sub_category_id, SubCategory.user_id == user_id)
        result = await self.db.execute(stmt)
        sub_category = result.scalar_one_or_none()
        if not sub_category:
            raise HTTPException(status_code=404, detail="SubCategory not found or you don't have permission")
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(sub_category, key, value)
            
        await self.db.commit()
        await self.db.refresh(sub_category)
        self.invalidate_cache()
        return sub_category

