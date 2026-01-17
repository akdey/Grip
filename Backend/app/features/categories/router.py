from typing import Annotated, List
from uuid import UUID
from fastapi import APIRouter, Depends
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.categories import schemas
from app.features.categories.service import CategoryService

router = APIRouter()

@router.get("/", response_model=List[schemas.CategoryResponse])
async def get_categories(
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[CategoryService, Depends()]
):
    return await service.get_categories(user_id=current_user.id)

@router.post("/", response_model=schemas.CategoryResponse)
async def create_category(
    data: schemas.CategoryCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[CategoryService, Depends()]
):
    return await service.create_category(user_id=current_user.id, data=data)

@router.post("/sub-categories", response_model=schemas.SubCategoryResponse)
async def create_sub_category(
    data: schemas.SubCategoryCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[CategoryService, Depends()]
):
    return await service.create_sub_category(user_id=current_user.id, data=data)

@router.delete("/{category_id}")
async def delete_category(
    category_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[CategoryService, Depends()]
):
    await service.delete_category(user_id=current_user.id, category_id=category_id)
    return {"status": "success"}

@router.delete("/sub-categories/{sub_category_id}")
async def delete_sub_category(
    sub_category_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[CategoryService, Depends()]
):
    await service.delete_sub_category(user_id=current_user.id, sub_category_id=sub_category_id)
    return {"status": "success"}
