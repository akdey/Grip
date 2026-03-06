from uuid import UUID
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from fastapi import HTTPException
from fastapi import Depends
from app.features.settle_up.models import LedgerEntry
from app.features.settle_up import schemas
from app.core.database import get_db

class SettleUpService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db

    async def get_peer_balances(self, user_id: UUID) -> List[schemas.PeerBalance]:
        """
        Gets a summary of all peers and the net balance owed.
        Positive: They owe you. Negative: You owe them.
        """
        stmt = (
            select(
                LedgerEntry.peer_name,
                func.sum(LedgerEntry.amount).label("net_balance"),
                func.max(LedgerEntry.date).label("last_activity_date")
            )
            .where(LedgerEntry.user_id == user_id)
            .group_by(LedgerEntry.peer_name)
            .having(func.sum(LedgerEntry.amount) != 0) # Optionally filter out settled (0) balances, or keep them for history
            .order_by(desc("last_activity_date"))
        )
        result = await self.db.execute(stmt)
        
        balances = []
        for row in result:
            balances.append(
                schemas.PeerBalance(
                    peer_name=row.peer_name,
                    net_balance=row.net_balance,
                    last_activity_date=row.last_activity_date,
                )
            )
        return balances

    async def get_peer_history(self, user_id: UUID, peer_name: str, limit: int = 50) -> List[LedgerEntry]:
        """Gets the transaction history for a specific peer."""
        stmt = (
            select(LedgerEntry)
            .where(LedgerEntry.user_id == user_id)
            .where(LedgerEntry.peer_name.ilike(peer_name))
            .order_by(LedgerEntry.date.desc(), LedgerEntry.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def add_ledger_entry(self, user_id: UUID, data: schemas.LedgerEntryCreate) -> LedgerEntry:
        """Adds a pure manual ledger entry (not shadowing a bank transaction)."""
        entry_data = data.model_dump()
        entry_data["user_id"] = user_id
        
        if not entry_data.get("date"):
            from datetime import date
            entry_data["date"] = date.today()

        entry = LedgerEntry(**entry_data)
        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)
        return entry
