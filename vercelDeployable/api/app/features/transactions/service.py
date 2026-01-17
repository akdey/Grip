from uuid import UUID
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from fastapi import Depends
from app.features.transactions.models import Transaction, MerchantMapping
from app.features.transactions import schemas
from app.features.transactions import schemas
from app.features.transactions.models import TransactionStatus
from app.core.database import get_db
import logging
logger = logging.getLogger(__name__)

class TransactionService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db

    async def _attach_icons(self, transactions: List[Transaction]) -> List[Transaction]:
        from app.features.categories.models import Category
        
        # Fetch all categories to create a mapping
        cat_stmt = select(Category)
        cat_result = await self.db.execute(cat_stmt)
        categories = cat_result.scalars().all()
        
        cat_map = {c.name.lower(): {"icon": c.icon, "color": c.color} for c in categories}
        sub_map = {}
        for c in categories:
            for s in c.sub_categories:
                # Key sub-categories by category_name + sub_category_name to avoid collisions
                key = (c.name.lower(), s.name.lower())
                sub_map[key] = {"icon": s.icon, "color": s.color}
        
        for t in transactions:
            cat_name = (t.category or "uncategorized").lower()
            sub_name = (t.sub_category or "uncategorized").lower()
            
            # Get category level info
            cat_info = cat_map.get(cat_name, {"icon": "HelpCircle", "color": "#666"})
            t.category_icon = cat_info["icon"]
            t.category_color = cat_info["color"]
            
            # Get sub-category level info with fallback to category
            sub_info = sub_map.get((cat_name, sub_name))
            if sub_info:
                t.sub_category_icon = sub_info["icon"] or cat_info["icon"]
                t.sub_category_color = sub_info["color"] or cat_info["color"]
            else:
                t.sub_category_icon = cat_info["icon"]
                t.sub_category_color = cat_info["color"]
                
        return transactions

    async def get_pending_transactions(self, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Transaction]:
        stmt = (
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .where(Transaction.status == TransactionStatus.PENDING)
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        transactions = result.scalars().all()
        return await self._attach_icons(transactions)

    async def get_all_transactions(self, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Transaction]:
        stmt = (
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .order_by(Transaction.transaction_date.desc().nulls_last(), Transaction.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        transactions = result.scalars().all()
        return await self._attach_icons(transactions)

    async def verify_transaction(self, transaction_id: UUID, user_id: UUID, verification: schemas.VerificationRequest) -> Transaction:
        stmt = select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == user_id)
        result = await self.db.execute(stmt)
        txn = result.scalar_one_or_none()
        
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")

        if not verification.approved:
            txn.status = TransactionStatus.REJECTED
        else:
            txn.status = TransactionStatus.VERIFIED
            txn.category = verification.category
            txn.sub_category = verification.sub_category
            
            raw_merchant_key = txn.merchant_name 
            txn.merchant_name = verification.merchant_name
            
            mapping_stmt = select(MerchantMapping).where(MerchantMapping.raw_merchant == raw_merchant_key)
            mapping_result = await self.db.execute(mapping_stmt)
            existing_mapping = mapping_result.scalar_one_or_none()
            
            if existing_mapping:
                 existing_mapping.display_name = verification.merchant_name
                 existing_mapping.default_category = verification.category
                 existing_mapping.default_sub_category = verification.sub_category
            else:
                 self.db.add(MerchantMapping(
                     raw_merchant=raw_merchant_key or "UNKNOWN",
                     display_name=verification.merchant_name,
                     default_category=verification.category,
                     default_sub_category=verification.sub_category
                 ))
                 
        await self.db.commit()
        await self.db.refresh(txn)
        return txn

    async def get_merchant_mapping(self, raw_merchant: str) -> Optional[MerchantMapping]:
        stmt = select(MerchantMapping).where(MerchantMapping.raw_merchant == raw_merchant)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_transaction_by_hash(self, content_hash: str) -> Optional[Transaction]:
        stmt = select(Transaction).where(Transaction.raw_content_hash == content_hash)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create_transaction(self, txn_data: dict) -> Transaction:
        txn = Transaction(**txn_data)
        self.db.add(txn)
        await self.db.commit()
        return txn

    async def create_manual_transaction(self, user_id: UUID, data: schemas.ManualTransactionCreate) -> Transaction:
        import hashlib
        import time
        import uuid
        from datetime import datetime
        
        seed = f"MANUAL-{user_id}-{time.time()}"
        content_hash = hashlib.sha256(seed.encode()).hexdigest()
        
        txn_data = data.model_dump()
        
        # Convert transaction_date datetime to date if needed
        if isinstance(txn_data.get("transaction_date"), datetime):
            txn_data["transaction_date"] = txn_data["transaction_date"].date()
        
        txn_data.update({
            "id": uuid.uuid4(),
            "user_id": user_id,
            "raw_content_hash": content_hash,
            "status": TransactionStatus.VERIFIED,
            "is_manual": True
        })
        
        return await self.create_transaction(txn_data)

    async def get_transaction(self, transaction_id: UUID, user_id: UUID) -> Transaction:
        stmt = select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == user_id)
        result = await self.db.execute(stmt)
        txn = result.scalar_one_or_none()
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")
        txns = await self._attach_icons([txn])
        return txns[0]

    async def update_transaction(self, transaction_id: UUID, user_id: UUID, data: schemas.ManualTransactionCreate) -> Transaction:
        stmt = select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == user_id)
        result = await self.db.execute(stmt)
        txn = result.scalar_one_or_none()
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        update_data = data.model_dump()
        for key, value in update_data.items():
            if key == "transaction_date" and value:
                from datetime import datetime
                if isinstance(value, datetime):
                    value = value.date()
                elif isinstance(value, str):
                    try:
                        value = datetime.fromisoformat(value).date()
                    except:
                        pass
            setattr(txn, key, value)
            
        await self.db.commit()
        await self.db.refresh(txn)
        txns = await self._attach_icons([txn])
        return txns[0]

    async def get_categories(self) -> dict:
        # Legacy method - should probably be removed as we now have a dedicated Categories service
        from app.features.categories.models import Category
        stmt = select(Category)
        result = await self.db.execute(stmt)
        categories = result.scalars().all()
        return {c.name: [s.name for s in c.sub_categories] for c in categories}
