from typing import Annotated, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.credit_cards.schemas import (
    CreditCardCreate,
    CreditCardUpdate,
    CreditCardResponse,
    CreditCardCycleInfo
)
from app.features.credit_cards.service import CreditCardService

router = APIRouter()


@router.post("", response_model=CreditCardResponse, status_code=status.HTTP_201_CREATED)
async def create_credit_card(
    card_data: CreditCardCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[CreditCardService, Depends()]
):
    """Create a new credit card with billing cycle information."""
    card = await service.create_card(db, current_user.id, card_data)
    return card


@router.get("", response_model=List[CreditCardResponse])
async def list_credit_cards(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[CreditCardService, Depends()],
    active_only: bool = True
):
    """List all credit cards for the current user."""
    cards = await service.get_user_cards(db, current_user.id, active_only)
    return cards


@router.get("/{card_id}", response_model=CreditCardResponse)
async def get_credit_card(
    card_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[CreditCardService, Depends()]
):
    """Get details of a specific credit card."""
    card = await service.get_card_by_id(db, card_id, current_user.id)
    
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credit card not found"
        )
    
    return card


@router.put("/{card_id}", response_model=CreditCardResponse)
async def update_credit_card(
    card_id: UUID,
    card_data: CreditCardUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[CreditCardService, Depends()]
):
    """Update a credit card."""
    card = await service.update_card(db, card_id, current_user.id, card_data)
    
    if not card:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credit card not found"
        )
    
    return card


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_credit_card(
    card_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[CreditCardService, Depends()]
):
    """Deactivate a credit card (soft delete)."""
    success = await service.deactivate_card(db, card_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credit card not found"
        )


@router.get("/{card_id}/cycle-info", response_model=CreditCardCycleInfo)
async def get_billing_cycle_info(
    card_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[CreditCardService, Depends()]
):
    """Get current billing cycle information for a credit card."""
    cycle_info = await service.get_cycle_info(db, card_id, current_user.id)
    
    if not cycle_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credit card not found"
        )
    
    return cycle_info
