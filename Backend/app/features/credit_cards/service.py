import logging
from uuid import UUID
from datetime import date
from decimal import Decimal
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.features.credit_cards.models import CreditCard
from app.features.credit_cards.schemas import CreditCardCreate, CreditCardUpdate, CreditCardCycleInfo
from app.features.transactions.models import Transaction
from app.features.transactions.enums import AccountType
from app.utils.finance_utils import get_billing_cycle_dates

logger = logging.getLogger(__name__)


class CreditCardService:
    
    async def create_card(
        self,
        db: AsyncSession,
        user_id: UUID,
        card_data: CreditCardCreate
    ) -> CreditCard:
        """Create a new credit card."""
        card = CreditCard(
            user_id=user_id,
            **card_data.model_dump()
        )
        db.add(card)
        await db.commit()
        await db.refresh(card)
        logger.info(f"Created credit card {card.card_name} for user {user_id}")
        return card
    
    async def get_user_cards(
        self,
        db: AsyncSession,
        user_id: UUID,
        active_only: bool = True
    ) -> List[CreditCard]:
        """Get all credit cards for a user."""
        stmt = select(CreditCard).where(CreditCard.user_id == user_id)
        
        if active_only:
            stmt = stmt.where(CreditCard.is_active == True)
        
        result = await db.execute(stmt)
        return list(result.scalars().all())
    
    async def get_card_by_id(
        self,
        db: AsyncSession,
        card_id: UUID,
        user_id: UUID
    ) -> Optional[CreditCard]:
        """Get a specific credit card by ID."""
        stmt = select(CreditCard).where(
            CreditCard.id == card_id,
            CreditCard.user_id == user_id
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    async def update_card(
        self,
        db: AsyncSession,
        card_id: UUID,
        user_id: UUID,
        card_data: CreditCardUpdate
    ) -> Optional[CreditCard]:
        """Update a credit card."""
        card = await self.get_card_by_id(db, card_id, user_id)
        
        if not card:
            return None
        
        update_data = card_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(card, field, value)
        
        await db.commit()
        await db.refresh(card)
        logger.info(f"Updated credit card {card_id}")
        return card
    
    async def deactivate_card(
        self,
        db: AsyncSession,
        card_id: UUID,
        user_id: UUID
    ) -> bool:
        """Deactivate a credit card (soft delete)."""
        card = await self.get_card_by_id(db, card_id, user_id)
        
        if not card:
            return False
        
        card.is_active = False
        await db.commit()
        logger.info(f"Deactivated credit card {card_id}")
        return True
    
    async def get_unbilled_amount(
        self,
        db: AsyncSession,
        card_id: UUID,
        cycle_start: date,
        cycle_end: date
    ) -> Decimal:
        """Calculate unbilled amount for current billing cycle."""
        stmt = (
            select(func.sum(Transaction.amount))
            .where(Transaction.credit_card_id == card_id)
            .where(Transaction.transaction_date >= cycle_start)
            .where(Transaction.transaction_date <= cycle_end)
        )
        
        result = await db.execute(stmt)
        amount = result.scalar()
        return amount or Decimal("0.00")
    
    async def get_cycle_info(
        self,
        db: AsyncSession,
        card_id: UUID,
        user_id: UUID
    ) -> Optional[CreditCardCycleInfo]:
        """Get current billing cycle information for a card."""
        card = await self.get_card_by_id(db, card_id, user_id)
        
        if not card:
            return None
        
        cycle_dates = get_billing_cycle_dates(card.statement_date)
        unbilled = await self.get_unbilled_amount(
            db,
            card_id,
            cycle_dates["cycle_start"],
            cycle_dates["cycle_end"]
        )
        
        utilization = None
        if card.credit_limit and card.credit_limit > 0:
            utilization = float((unbilled / card.credit_limit) * 100)
        
        return CreditCardCycleInfo(
            card_id=card.id,
            card_name=card.card_name,
            cycle_start=cycle_dates["cycle_start"],
            cycle_end=cycle_dates["cycle_end"],
            next_statement_date=cycle_dates["next_statement_date"],
            days_until_statement=cycle_dates["days_until_statement"],
            unbilled_amount=unbilled,
            credit_limit=card.credit_limit,
            utilization_percentage=utilization
        )
    
    async def get_all_unbilled_for_user(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> Decimal:
        """Get total unbilled amount across all active credit cards for a user."""
        cards = await self.get_user_cards(db, user_id, active_only=True)
        
        total_unbilled = Decimal("0.00")
        
        for card in cards:
            cycle_dates = get_billing_cycle_dates(card.statement_date)
            unbilled = await self.get_unbilled_amount(
                db,
                card.id,
                cycle_dates["cycle_start"],
                cycle_dates["cycle_end"]
            )
            total_unbilled += unbilled
        
        return total_unbilled
