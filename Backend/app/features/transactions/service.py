from uuid import UUID
from typing import List, Optional
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import HTTPException
from fastapi import Depends
from app.features.transactions.models import Transaction, MerchantMapping, AccountType, TransactionStatus
from app.features.transactions import schemas
from app.features.categories.models import SubCategory
from app.features.settle_up.models import SettleUpEntry
from app.core.database import get_db
from decimal import Decimal
import logging
logger = logging.getLogger(__name__)

# Categories that trigger auto-shadowing to the Settle Up ledger
# Sub-categories that trigger auto-shadowing to the Settle Up ledger
# These must match the exact sub_category names stored in the DB
SETTLE_UP_SUBCATEGORIES = {"p2p loan out", "p2p receive"}

class TransactionService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db

    async def _resolve_surety(self, sub_category_name: str, user_id: UUID = None) -> bool:
        """Resolve is_surety flag from the categories cache."""
        if not sub_category_name:
            return False
            
        from app.features.categories.service import CategoryService
        cat_service = CategoryService(self.db)
        categories = await cat_service.get_cached_categories(user_id)
        
        for cat in categories:
            for sub in cat.sub_categories:
                if sub.name.lower() == sub_category_name.lower():
                    return sub.is_surety
        return False

    async def _attach_icons(self, transactions: List[Transaction]) -> List[Transaction]:
        from app.features.categories.models import Category
        from app.features.categories.service import CategoryService
        
        # Use CategoryService to get cached categories
        cat_service = CategoryService(self.db)
        # We use a dummy user_id here for system categories, 
        # or we could pass the actual user_id if we want user-specific icons
        # but for icon mapping, system defaults are usually enough.
        user_id = transactions[0].user_id if transactions else None
        categories = await cat_service.get_cached_categories(user_id)
        
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

    async def get_all_transactions(
        self, 
        user_id: UUID, 
        skip: int = 0, 
        limit: int = 100,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        category: Optional[str] = None,
        sub_category: Optional[str] = None,
        search: Optional[str] = None,
        credit_card_id: Optional[UUID] = None
    ) -> List[Transaction]:
        from sqlalchemy import or_
        try:
            stmt = (
                select(Transaction)
                .where(Transaction.user_id == user_id)
            )

            if credit_card_id:
                stmt = stmt.where(Transaction.credit_card_id == credit_card_id)

            if start_date:
                stmt = stmt.where(Transaction.transaction_date >= start_date)
            if end_date:
                stmt = stmt.where(Transaction.transaction_date <= end_date)
            
            if category:
                cat_list = [c.strip() for c in category.split(",") if c.strip()]
                if len(cat_list) == 1:
                    stmt = stmt.where(Transaction.category.ilike(cat_list[0]))
                elif len(cat_list) > 1:
                    stmt = stmt.where(or_(*[Transaction.category.ilike(c) for c in cat_list]))
            if sub_category:
                stmt = stmt.where(Transaction.sub_category.ilike(sub_category))
                
            if search:
                search_term = f"%{search}%"
                stmt = stmt.where(
                    or_(
                        Transaction.merchant_name.ilike(search_term),
                        Transaction.remarks.ilike(search_term),
                        Transaction.category.ilike(search_term),
                        Transaction.sub_category.ilike(search_term)
                    )
                )

            stmt = (
                stmt
                .order_by(Transaction.transaction_date.desc().nulls_last(), Transaction.created_at.desc())
                .offset(skip)
                .limit(limit)
            )
            result = await self.db.execute(stmt)
            transactions = result.scalars().all()
            return await self._attach_icons(transactions)
        except Exception as e:
            logger.error(f"Error fetching transactions: {e}")
            # If critical parameter error, could raise HTTPException.
            # But to keep UI stable, return empty list or re-raise
            raise HTTPException(status_code=500, detail=f"Failed to fetch transactions: {str(e)}")

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
            if verification.amount is not None:
                txn.amount = verification.amount
            if verification.account_type is not None:
                txn.account_type = verification.account_type
                if verification.account_type != "CREDIT_CARD":
                    txn.credit_card_id = None
            if verification.credit_card_id is not None:
                txn.credit_card_id = verification.credit_card_id
            if verification.transaction_date is not None:
                t_date = verification.transaction_date.date() if hasattr(verification.transaction_date, "date") else verification.transaction_date
                txn.transaction_date = t_date
            txn.is_surety = await self._resolve_surety(verification.sub_category, user_id)
            txn.tags = verification.tags
            txn.remarks = verification.remarks
            
            raw_merchant_key = txn.merchant_name 
            txn.merchant_name = verification.merchant_name
            
            raw_merchant_clean = raw_merchant_key.strip().upper() if raw_merchant_key else ""
            is_placeholder = not raw_merchant_clean or raw_merchant_clean in {"UNKNOWN", "UNCATEGORIZED", "NULL", "UNKNOWN MERCHANT"}
            
            if not is_placeholder:
                mapping_stmt = select(MerchantMapping).where(func.lower(MerchantMapping.raw_merchant) == raw_merchant_key.strip().lower())
                mapping_result = await self.db.execute(mapping_stmt)
                existing_mapping = mapping_result.scalar_one_or_none()
                
                if existing_mapping:
                     existing_mapping.display_name = verification.merchant_name
                     existing_mapping.default_category = verification.category
                     existing_mapping.default_sub_category = verification.sub_category
                else:
                     self.db.add(MerchantMapping(
                         raw_merchant=raw_merchant_key,
                         display_name=verification.merchant_name,
                         default_category=verification.category,
                         default_sub_category=verification.sub_category
                     ))
                 
            if not txn.transaction_date:
                txn.transaction_date = txn.created_at.date()

        await self.db.commit()

        if verification.approved:
            await self._sync_double_entry_credit_card_payment(txn)
            await self._maybe_shadow_to_ledger(txn)
            if (txn.category or "").lower() == "investment":
                try:
                    from app.features.wealth.service import WealthService
                    wealth_service = WealthService(self.db)
                    await wealth_service.process_transaction_for_investments(txn)
                except Exception as e:
                    logger.warning(f"Wealth auto-linking skipped for txn {txn.id}: {e}")
        else:
            await self._sync_double_entry_credit_card_payment(txn)

        return txn

    async def get_merchant_mapping(self, raw_merchant: str) -> Optional[MerchantMapping]:
        if not raw_merchant:
            return None
        raw_merchant_clean = raw_merchant.strip().upper()
        if raw_merchant_clean in {"UNKNOWN", "UNCATEGORIZED", "NULL", "UNKNOWN MERCHANT"}:
            return None
            
        stmt = select(MerchantMapping).where(func.lower(MerchantMapping.raw_merchant) == raw_merchant.strip().lower())
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
            "is_manual": True,
            "is_surety": txn_data.get("is_surety", False) or await self._resolve_surety(txn_data.get("sub_category"), user_id)
        })
        
        txn = await self.create_transaction(txn_data)

        # Sync double-entry credit offset if this is a Credit Card Payment
        await self._sync_double_entry_credit_card_payment(txn)

        # Shadow to Settle Up ledger if this is a loan-related category
        await self._maybe_shadow_to_ledger(txn)

        if (txn.category or "").lower() == "investment":
            try:
                from app.features.wealth.service import WealthService
                wealth_service = WealthService(self.db)
                await wealth_service.process_transaction_for_investments(txn)
            except Exception as e:
                logger.warning(f"Wealth auto-linking skipped for manual txn {txn.id}: {e}")

        return txn

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
            
        # Re-evaluate surety if category changes
        if "category" in update_data or "sub_category" in update_data:
             # If user explicitly updated is_surety in the same request, respect it (via setattr above)
             # But if only category changed, re-evaluate. 
             # Check if is_surety is in update_data
             if "is_surety" not in update_data:
                txn.is_surety = await self._resolve_surety(txn.sub_category, user_id)
            
        await self.db.commit()
        await self._sync_double_entry_credit_card_payment(txn)
        txns = await self._attach_icons([txn])
        return txns[0]

    async def get_tags_summary(self, user_id: UUID) -> List[dict]:
        stmt = select(Transaction.tags, Transaction.amount, Transaction.transaction_date).where(
            Transaction.user_id == user_id,
            Transaction.status == TransactionStatus.VERIFIED
        )
        result = await self.db.execute(stmt)
        
        tags_data = {}
        for tags, amount, date in result.all():
            if tags:
                for tag in tags:
                    clean_tag = tag.strip().lower()
                    if clean_tag not in tags_data:
                        tags_data[clean_tag] = {
                            "tag": tag.strip(), 
                            "count": 0, 
                            "amount": Decimal("0"), 
                            "last_used": None
                        }
                    
                    tags_data[clean_tag]["count"] += 1
                    tags_data[clean_tag]["amount"] += amount
                    
                    if date:
                        current_last = tags_data[clean_tag]["last_used"]
                        if not current_last or date > current_last:
                            tags_data[clean_tag]["last_used"] = date
                            
        # Sort by count descending, then by last updated
        sorted_tags = sorted(
            tags_data.values(), 
            key=lambda x: (x["count"], x["last_used"] or date.min), 
            reverse=True
        )
        return sorted_tags

    async def get_categories(self) -> dict:
        # Legacy method - should probably be removed as we now have a dedicated Categories service
        from app.features.categories.models import Category
        stmt = select(Category)
        result = await self.db.execute(stmt)
        categories = result.scalars().all()
        return {c.name: [s.name for s in c.sub_categories] for c in categories}

    async def toggle_settled_status(self, transaction_id: UUID, user_id: UUID) -> Transaction:
        stmt = select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == user_id)
        result = await self.db.execute(stmt)
        txn = result.scalar_one_or_none()
        
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")
            
        txn.is_settled = not txn.is_settled
        await self.db.commit()
        
        try:
            from app.features.analytics.service import AnalyticsService
            AnalyticsService._safe_spend_cache.pop(user_id, None)
        except Exception:
            pass
            
        txns = await self._attach_icons([txn])
        return txns[0]

    async def delete_transaction(self, transaction_id: UUID, user_id: UUID):
        stmt = select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == user_id)
        result = await self.db.execute(stmt)
        txn = result.scalar_one_or_none()
        
        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")

        # Delete corresponding double-entry offset transaction if one exists
        offset_stmt = select(Transaction).where(
            Transaction.user_id == user_id,
            Transaction.raw_content_hash == f"CC-OFFSET-{transaction_id}"
        )
        offset_res = await self.db.execute(offset_stmt)
        offset_txn = offset_res.scalar_one_or_none()
        if offset_txn:
            await self.db.delete(offset_txn)
            
        await self.db.delete(txn)
        await self.db.commit()

    async def _sync_double_entry_credit_card_payment(self, txn: Transaction):
        """
        Double-Entry tracking constraint:
        A debit on SAVINGS for "Credit Card Payment" must credit (+Amount) the
        CREDIT_CARD account to reduce outstanding liability without touching
        the Period Expense KPI.
        """
        # Guard against recursive handling of generated offset transactions
        if txn.raw_content_hash and txn.raw_content_hash.startswith("CC-OFFSET-"):
            return

        sub_cat = (txn.sub_category or "").strip().lower()
        acc_type = (txn.account_type or "").strip().upper()
        is_debit = (txn.amount or Decimal("0")) < 0
        is_verified = txn.status == TransactionStatus.VERIFIED
        
        is_cc_payment_debit = (
            sub_cat == "credit card payment" and
            acc_type in (AccountType.SAVINGS, AccountType.CASH, "ACCOUNT") and
            is_debit and
            is_verified
        )
        
        offset_hash = f"CC-OFFSET-{txn.id}"
        stmt = select(Transaction).where(Transaction.raw_content_hash == offset_hash)
        res = await self.db.execute(stmt)
        existing_offset = res.scalar_one_or_none()
        
        if is_cc_payment_debit:
            credit_amount = abs(txn.amount)
            target_card_id = txn.credit_card_id
            
            if not target_card_id:
                from app.features.credit_cards.models import CreditCard
                card_stmt = (
                    select(CreditCard.id)
                    .where(CreditCard.user_id == txn.user_id, CreditCard.is_active == True)
                    .order_by(CreditCard.created_at.asc())
                    .limit(1)
                )
                target_card_id = (await self.db.execute(card_stmt)).scalar_one_or_none()
                
            t_date = txn.transaction_date or (txn.created_at.date() if txn.created_at else date.today())
            
            if existing_offset:
                existing_offset.amount = credit_amount
                existing_offset.transaction_date = t_date
                existing_offset.merchant_name = txn.merchant_name or "Credit Card Payment"
                existing_offset.credit_card_id = target_card_id or existing_offset.credit_card_id
                existing_offset.status = TransactionStatus.VERIFIED
                await self.db.commit()
                logger.info(f"[DoubleEntry] Updated CC credit offset {existing_offset.id} for txn {txn.id}, Amount: +{credit_amount}")
            else:
                offset_txn = Transaction(
                    user_id=txn.user_id,
                    raw_content_hash=offset_hash,
                    amount=credit_amount,
                    currency=txn.currency or "INR",
                    merchant_name=txn.merchant_name or "Credit Card Payment",
                    category=txn.category or "Bill Payment",
                    sub_category="Credit Card Payment",
                    status=TransactionStatus.VERIFIED,
                    account_type=AccountType.CREDIT_CARD,
                    credit_card_id=target_card_id,
                    transaction_date=t_date,
                    is_manual=txn.is_manual,
                    is_settled=False,
                    remarks=f"[Double-Entry Offset] Credit leg for transaction {txn.id}"
                )
                self.db.add(offset_txn)
                await self.db.commit()
                logger.info(f"[DoubleEntry] Created CC credit offset {offset_txn.id} for txn {txn.id}, Amount: +{credit_amount}")
        else:
            if existing_offset:
                await self.db.delete(existing_offset)
                await self.db.commit()
                logger.info(f"[DoubleEntry] Removed CC credit offset {existing_offset.id} as txn {txn.id} is no longer a CC payment debit")

    async def _maybe_shadow_to_ledger(self, txn: Transaction):
        """If the transaction sub_category matches a Settle Up keyword, shadow it to the Peer Ledger."""
        sub_cat_lower = (txn.sub_category or "").lower().strip()
        if sub_cat_lower not in SETTLE_UP_SUBCATEGORIES:
            return

        # Check if a ledger entry already exists for this transaction
        existing = await self.db.execute(
            select(SettleUpEntry).where(SettleUpEntry.transaction_id == txn.id)
        )
        if existing.scalar_one_or_none():
            return

        entry = SettleUpEntry(
            user_id=txn.user_id,
            peer_name=txn.merchant_name or "Unknown",
            amount=txn.amount,
            transaction_id=txn.id,
            remarks=txn.remarks,
            date=txn.transaction_date or txn.created_at.date() if txn.created_at else None
        )
        self.db.add(entry)
        await self.db.commit()
        logger.info(f"[SettleUp] Shadowed txn {txn.id} -> Peer: {entry.peer_name}, Amount: {entry.amount}")
