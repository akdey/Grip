from typing import Annotated, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.anomaly.service import AnomalyService
from app.features.anomaly.schemas import (
    AnomalyFlagResponse,
    AnomalyListResponse,
    AnomalyScanResponse
)

router = APIRouter()

@router.get("/flags", response_model=AnomalyListResponse)
async def get_anomaly_flags(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(50, ge=1, le=200)
):
    """
    Get all active (undismissed) anomaly alerts for the authenticated user.
    """
    service = AnomalyService(db)
    flags = await service.get_active_flags(current_user.id, limit=limit)
    high_count = sum(1 for f in flags if f.severity == "high")

    return AnomalyListResponse(
        active_count=len(flags),
        high_severity_count=high_count,
        flags=flags
    )

@router.post("/scan", response_model=AnomalyScanResponse)
async def scan_anomalies(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Trigger an on-demand scan of transactions and obligations to detect new spending anomalies.
    """
    service = AnomalyService(db)
    new_count, active_flags = await service.scan_and_record_anomalies(current_user.id)

    return AnomalyScanResponse(
        new_anomalies_found=new_count,
        total_active=len(active_flags),
        flags=active_flags
    )

@router.post("/flags/{flag_id}/dismiss")
async def dismiss_flag(
    flag_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Dismiss a specific anomaly alert so it no longer clutters the dashboard.
    """
    service = AnomalyService(db)
    success = await service.dismiss_flag(current_user.id, flag_id)
    if not success:
        raise HTTPException(status_code=404, detail="Anomaly flag not found")

    return {"status": "success", "message": "Anomaly dismissed"}

@router.post("/flags/dismiss-all")
async def dismiss_all_flags(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Dismiss all active anomaly alerts in one action.
    """
    service = AnomalyService(db)
    count = await service.dismiss_all(current_user.id)

    return {"status": "success", "dismissed_count": count}
