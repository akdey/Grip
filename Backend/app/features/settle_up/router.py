from uuid import UUID
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.settle_up import schemas
from app.features.settle_up.service import SettleUpService

router = APIRouter()

@router.get("/balances", response_model=List[schemas.PeerBalance])
async def get_peer_balances(
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[SettleUpService, Depends()],
    include_settled: bool = True
):
    return await service.get_peer_balances(user_id=current_user.id, include_settled=include_settled)

@router.get("/contacts", response_model=List[schemas.PeerContactOut])
async def get_all_contacts(
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[SettleUpService, Depends()]
):
    return await service.get_all_contacts(user_id=current_user.id)

@router.get("/{peer_name}/contact", response_model=Optional[schemas.PeerContactOut])
async def get_peer_contact(
    peer_name: str,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[SettleUpService, Depends()]
):
    return await service.get_peer_contact(user_id=current_user.id, peer_name=peer_name)

@router.put("/{peer_name}/contact", response_model=schemas.PeerContactOut)
async def upsert_peer_contact(
    peer_name: str,
    data: schemas.PeerContactUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[SettleUpService, Depends()]
):
    return await service.upsert_peer_contact(user_id=current_user.id, peer_name=peer_name, data=data)

@router.post("/{peer_name}/send-reminder", response_model=schemas.SendEmailReminderResponse)
async def send_email_reminder(
    peer_name: str,
    data: schemas.SendEmailReminderRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    service: Annotated[SettleUpService, Depends()]
):
    return await service.send_email_reminder(
        user_id=current_user.id,
        peer_name=peer_name,
        custom_note=data.custom_note,
        subject=data.subject
    )

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
