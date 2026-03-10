from uuid import UUID
from typing import Annotated, List
from fastapi import APIRouter, Depends
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.settle_up import schemas
from app.features.settle_up.service import SettleUpService

router = APIRouter()

@router.get("/balances", response_model=List[schemas.PeerBalance])
async def get_peer_balances(
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[SettleUpService, Depends()]
):
    return await service.get_peer_balances(user_id=current_user.id)

@router.get("/{peer_name}/history", response_model=List[schemas.SettleUpEntryResponse])
async def get_peer_history(
    peer_name: str,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[SettleUpService, Depends()],
    limit: int = 50
):
    return await service.get_peer_history(user_id=current_user.id, peer_name=peer_name, limit=limit)

@router.post("/", response_model=schemas.SettleUpEntryResponse)
async def create_ledger_entry(
    data: schemas.SettleUpEntryCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[SettleUpService, Depends()]
):
    return await service.add_ledger_entry(user_id=current_user.id, data=data)

@router.put("/{entry_id}", response_model=schemas.SettleUpEntryResponse)
async def update_settle_up_entry(
    entry_id: UUID,
    data: schemas.SettleUpEntryUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[SettleUpService, Depends()]
):
    return await service.update_settle_up_entry(user_id=current_user.id, entry_id=entry_id, data=data)

@router.delete("/{entry_id}")
async def delete_settle_up_entry(
    entry_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[SettleUpService, Depends()]
):
    await service.delete_settle_up_entry(user_id=current_user.id, entry_id=entry_id)
    return {"status": "success"}
