from typing import Annotated, List, Optional
from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.transactions import schemas
from app.features.transactions.service import TransactionService

from app.features.categories.schemas import CategoryResponse
from app.features.categories.service import CategoryService

router = APIRouter()

@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[CategoryService, Depends()]
):
    categories = await service.get_categories(user_id=current_user.id)
    # Return in legacy format if possible, or just return the new format
    # The frontend useCategories hook was updated to use /categories directly,
    # but some other parts might still use /transactions/categories.
    # Actually, let's just return the new format here too for consistency.
    return categories

@router.get("/pending", response_model=List[schemas.TransactionResponse])
async def get_pending_transactions(
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[TransactionService, Depends()],
    skip: int = 0,
    limit: int = 100
):
    return await service.get_pending_transactions(user_id=current_user.id, skip=skip, limit=limit)

@router.get("/", response_model=List[schemas.TransactionResponse])
async def get_all_transactions(
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[TransactionService, Depends()],
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    sub_category: Optional[str] = None,
    search: Optional[str] = None,
    credit_card_id: Optional[UUID] = None
):
    parsed_start = date.fromisoformat(start_date) if start_date else None
    parsed_end = date.fromisoformat(end_date) if end_date else None
    
    return await service.get_all_transactions(
        user_id=current_user.id, 
        skip=skip, 
        limit=limit,
        start_date=parsed_start,
        end_date=parsed_end,
        category=category,
        sub_category=sub_category,
        search=search,
        credit_card_id=credit_card_id
    )

@router.post("/", response_model=schemas.TransactionResponse)
async def create_manual_transaction(
    data: schemas.ManualTransactionCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[TransactionService, Depends()]
):
    return await service.create_manual_transaction(user_id=current_user.id, data=data)

@router.patch("/{transaction_id}/verify", response_model=schemas.TransactionResponse)
async def verify_transaction(
    transaction_id: UUID,
    verification: schemas.VerificationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[TransactionService, Depends()]
):
    return await service.verify_transaction(transaction_id=transaction_id, user_id=current_user.id, verification=verification)

@router.get("/{transaction_id}", response_model=schemas.TransactionResponse)
async def get_transaction(
    transaction_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[TransactionService, Depends()]
):
    return await service.get_transaction(transaction_id=transaction_id, user_id=current_user.id)

@router.put("/{transaction_id}", response_model=schemas.TransactionResponse)
async def update_transaction(
    transaction_id: UUID,
    data: schemas.ManualTransactionCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[TransactionService, Depends()]
):
    return await service.update_transaction(transaction_id=transaction_id, user_id=current_user.id, data=data) 

@router.patch("/{transaction_id}/toggle-settled", response_model=schemas.TransactionResponse)
async def toggle_settled_status(
    transaction_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[TransactionService, Depends()]
):
    return await service.toggle_settled_status(transaction_id=transaction_id, user_id=current_user.id) 
