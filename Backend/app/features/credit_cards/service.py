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
        """
        Calculate total unsettled debt for the card.
        Ignores cycle dates in favor of explicit 'is_settled' status.
        """
        stmt = (
            select(func.sum(Transaction.amount))
            .where(Transaction.credit_card_id == card_id)
            .where(Transaction.is_settled == False) # Only include unpaid transactions
        )
        
        result = await db.execute(stmt)
        amount = result.scalar() or Decimal("0.00")
        # Transactions are stored as: Expense negative (-), Income positive (+)
        # Unbilled amount (Debt) should be positive for expenses.
        # So we negate the sum. (-(-1000) = 1000 debt).
        return -amount
    
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
    
    async def get_card_exposure_ledger(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> dict:
        """
        Get all unsettled credit card transactions representing card exposure.
        Returns: {
            "total_exposure": Decimal,
            "items": List[CardExposureItem],
            "card_breakdown": List[CardExposureSummary]
        }
        """
        from sqlalchemy import or_
        from app.features.transactions.models import AccountType
        from app.features.analytics.schemas import CardExposureItem, CardExposureSummary
        
        stmt = (
            select(Transaction, CreditCard)
            .outerjoin(CreditCard, Transaction.credit_card_id == CreditCard.id)
            .where(Transaction.user_id == user_id)
            .where(Transaction.category != "Income")
            .where(
                or_(
                    Transaction.account_type == AccountType.CREDIT_CARD,
                    Transaction.credit_card_id.isnot(None)
                )
            )
            .where(Transaction.is_settled == False)
            .where(Transaction.is_surety == False)
            .order_by(Transaction.transaction_date.desc().nulls_last(), Transaction.created_at.desc())
        )
        
        res = await db.execute(stmt)
        rows = res.all()
        
        items = []
        total_exposure = Decimal("0.00")
        card_group_map = {}
        
        for txn, card in rows:
            amt = abs(txn.amount or Decimal("0.00"))
            total_exposure += amt
            
            card_id_str = str(card.id) if card else None
            card_name = card.card_name if card else "Credit Card"
            card_last_four = card.last_four_digits if card else None
            
            t_date = txn.transaction_date or (txn.created_at.date() if txn.created_at else date.today())
            
            items.append(CardExposureItem(
                id=str(txn.id),
                merchant_name=txn.merchant_name or txn.remarks or txn.category or "Credit Card Transaction",
                amount=amt,
                transaction_date=t_date,
                card_id=card_id_str,
                card_name=card_name,
                last_four_digits=card_last_four,
                category=txn.category,
                sub_category=txn.sub_category,
                status="UNSETTLED"
            ))
            
            group_key = card_id_str or "unassigned"
            if group_key not in card_group_map:
                card_group_map[group_key] = {
                    "card_id": card_id_str,
                    "card_name": card_name,
                    "last_four_digits": card_last_four,
                    "amount": Decimal("0.00"),
                    "count": 0
                }
            card_group_map[group_key]["amount"] += amt
            card_group_map[group_key]["count"] += 1
            
        card_breakdown = [
            CardExposureSummary(
                card_id=data["card_id"],
                card_name=data["card_name"],
                last_four_digits=data["last_four_digits"],
                amount=data["amount"],
                count=data["count"]
            )
            for data in card_group_map.values()
        ]
        card_breakdown.sort(key=lambda x: x.amount, reverse=True)
        
        return {
            "total_exposure": total_exposure,
            "items": items,
            "card_breakdown": card_breakdown
        }

    async def get_all_unbilled_for_user(
        self,
        db: AsyncSession,
        user_id: UUID
    ) -> Decimal:
        """Get total unbilled amount across all credit card exposure for a user."""
        res = await self.get_card_exposure_ledger(db, user_id)
        return res["total_exposure"]
