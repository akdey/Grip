from typing import Annotated, List, Optional
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.bills.schemas import (
    BillCreate,
    BillUpdate,
    BillResponse,
    MarkPaidRequest,
    BillResponse,
    MarkPaidRequest,
    UpcomingBillsResponse,
    SuretyExclusionCreate
)
from app.features.bills.service import BillService

router = APIRouter()

@router.get("/surety/list")
async def list_sureties(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[BillService, Depends()],
    include_hidden: bool = True
):
    """List all detected surety obligations, including hidden/excluded ones."""
    ledger = await service.get_obligations_ledger(db, current_user.id, days_ahead=60, include_hidden=include_hidden)
    # Filter only Surety items
    sureties = [item for item in ledger["items"] if item.type == "SURETY_TXN"]
    return sureties

@router.post("/surety/exclusion")
async def create_exclusion(
    exclusion_data: SuretyExclusionCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[BillService, Depends()]
):
    """Create an exclusion rule for a surety."""
    excl = await service.create_surety_exclusion(db, current_user.id, exclusion_data)
    return {"status": "success", "id": str(excl.id)}


@router.post("", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
async def create_bill(
    bill_data: BillCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[BillService, Depends()]
):
    """Create a new bill (one-time or recurring)."""
    bill = await service.create_bill(db, current_user.id, bill_data)
    return bill


@router.get("", response_model=List[BillResponse])
async def list_bills(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[BillService, Depends()],
    paid: Optional[bool] = Query(None, description="Filter by paid status")
):
    """List all bills for the current user."""
    bills = await service.get_user_bills(db, current_user.id, paid_filter=paid)
    return bills


@router.get("/upcoming", response_model=UpcomingBillsResponse)
async def get_upcoming_bills(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[BillService, Depends()],
    days: int = Query(30, ge=1, le=90, description="Number of days to look ahead")
):
    """Get unpaid bills due in the next X days."""
    bills = await service.get_upcoming_bills(db, current_user.id, days_ahead=days)
    
    total_amount = sum(bill.amount for bill in bills)
    
    return UpcomingBillsResponse(
        upcoming_bills=bills,
        total_amount=Decimal(str(total_amount)),
        count=len(bills)
    )


@router.get("/{bill_id}", response_model=BillResponse)
async def get_bill(
    bill_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[BillService, Depends()]
):
    """Get details of a specific bill."""
    bill = await service.get_bill_by_id(db, bill_id, current_user.id)
    
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found"
        )
    
    return bill


@router.put("/{bill_id}", response_model=BillResponse)
async def update_bill(
    bill_id: UUID,
    bill_data: BillUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[BillService, Depends()]
):
    """Update a bill."""
    bill = await service.update_bill(db, bill_id, current_user.id, bill_data)
    
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found"
        )
    
    return bill


@router.post("/{bill_id}/mark-paid", response_model=BillResponse)
async def mark_bill_paid(
    bill_id: UUID,
    request: MarkPaidRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[BillService, Depends()]
):
    """Mark a bill as paid or unpaid."""
    bill = await service.mark_paid(db, bill_id, current_user.id, request.paid)
    
    if not bill:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bill not found"
        )
    
    return bill
