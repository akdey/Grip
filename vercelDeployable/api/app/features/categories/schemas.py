import uuid
from typing import List, Optional
from pydantic import BaseModel

class SubCategoryBase(BaseModel):
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None

class SubCategoryCreate(SubCategoryBase):
    category_id: uuid.UUID

class SubCategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class SubCategoryResponse(SubCategoryBase):
    id: uuid.UUID
    category_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True

class CategoryBase(BaseModel):
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    sub_categories: List[SubCategoryResponse] = []

    class Config:
        from_attributes = True
