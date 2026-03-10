from uuid import UUID
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from fastapi import HTTPException
from fastapi import Depends
from app.features.settle_up.models import SettleUpEntry
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
                func.max(SettleUpEntry.peer_name).label("peer_name"),
                func.sum(SettleUpEntry.amount).label("net_balance"),
                func.max(SettleUpEntry.date).label("last_activity_date")
            )
            .where(SettleUpEntry.user_id == user_id)
            .group_by(func.lower(SettleUpEntry.peer_name))
            .having(func.sum(SettleUpEntry.amount) != 0) # Optionally filter out settled (0) balances, or keep them for history
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

    async def get_peer_history(self, user_id: UUID, peer_name: str, limit: int = 50) -> List[SettleUpEntry]:
        """Gets the transaction history for a specific peer."""
        peer_name_stripped = peer_name.strip()
        stmt = (
            select(SettleUpEntry)
            .where(SettleUpEntry.user_id == user_id)
            .where(SettleUpEntry.peer_name.ilike(peer_name_stripped))
            .order_by(SettleUpEntry.date.desc(), SettleUpEntry.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def add_ledger_entry(self, user_id: UUID, data: schemas.SettleUpEntryCreate) -> SettleUpEntry:
        """Adds a pure manual ledger entry (not shadowing a bank transaction)."""
        entry_data = data.model_dump()
        entry_data["user_id"] = user_id
        
        if not entry_data.get("date"):
            from datetime import date
            entry_data["date"] = date.today()

        entry = SettleUpEntry(**entry_data)
        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)
        return entry

    async def update_settle_up_entry(self, user_id: UUID, entry_id: UUID, data: schemas.SettleUpEntryUpdate) -> SettleUpEntry:
        """Updates an existing settle-up entry."""
        stmt = select(SettleUpEntry).where(SettleUpEntry.id == entry_id, SettleUpEntry.user_id == user_id)
        result = await self.db.execute(stmt)
        entry = result.scalar_one_or_none()
        
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(entry, field, value)

        await self.db.commit()
        await self.db.refresh(entry)
        return entry

    async def delete_settle_up_entry(self, user_id: UUID, entry_id: UUID) -> bool:
        """Deletes a settle-up entry."""
        stmt = select(SettleUpEntry).where(SettleUpEntry.id == entry_id, SettleUpEntry.user_id == user_id)
        result = await self.db.execute(stmt)
        entry = result.scalar_one_or_none()
        
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")

        await self.db.delete(entry)
        await self.db.commit()
        return True
