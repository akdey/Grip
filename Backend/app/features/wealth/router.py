
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.features.auth.deps import get_current_user
from app.features.wealth import schemas
from app.features.wealth.service import WealthService
from app.features.wealth.models import InvestmentHolding
from app.features.auth.models import User

router = APIRouter(tags=["Wealth"])

@router.get("/holdings", response_model=List[schemas.InvestmentHoldingOut])
async def get_holdings(
    current_user: User = Depends(get_current_user),
    service: WealthService = Depends()
):
    return await service.get_holdings(current_user.id)

@router.get("/holdings/{holding_id}", response_model=schemas.InvestmentHoldingDetail)
async def get_holding_details(
    holding_id: UUID,
    current_user: User = Depends(get_current_user),
    service: WealthService = Depends()
):
    try:
        return await service.get_holding_details(holding_id, current_user.id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Holding not found")

@router.post("/holdings", response_model=schemas.InvestmentHoldingOut)
async def create_holding(
    holding: schemas.InvestmentHoldingCreate,
    current_user: User = Depends(get_current_user),
    service: WealthService = Depends()
):
    return await service.create_holding(current_user.id, holding)

@router.post("/forecast", response_model=schemas.ForecastResponse)
async def get_forecast(
    request: schemas.ForecastRequest,
    current_user: User = Depends(get_current_user),
    service: WealthService = Depends()
):
    # This might be slow, run asynchronously or accept latency?
    # For now synchronous
    return await service.generate_forecast(current_user.id, request.years)

@router.post("/map-transaction")
async def map_transaction(
    payload: schemas.MapTransactionRequest,
    current_user: User = Depends(get_current_user),
    service: WealthService = Depends()
):
    try:
        await service.map_transaction(payload.transaction_id, payload.holding_id, payload.create_rule)
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/sync-prices")
async def trigger_price_sync(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    service: WealthService = Depends()
):
    # Retrieve all holdings for user and refresh their prices
    # We can do this in background
    async def _sync_job():
        # TODO: Implement bulk sync in service
        pass 
    
    # Placeholder for now
    return {"message": "Sync triggered"}

@router.post("/import-cams", response_model=schemas.CAMSImportResponse)
async def import_cams_statement(
    request: schemas.CAMSImportRequest,
    current_user: User = Depends(get_current_user),
    service: WealthService = Depends()
):
    """Import CAMS consolidated account statement."""
    return await service.import_cams_statement(current_user.id, request)

@router.get("/holdings/{holding_id}/sip-analysis", response_model=schemas.SIPDateAnalysisResponse)
async def analyze_sip_date_performance(
    holding_id: UUID,
    current_user: User = Depends(get_current_user),
    service: WealthService = Depends()
):
    """
    Analyze SIP date-specific performance.
    Compares user's actual SIP dates against alternative dates (1st, 5th, 10th, 15th, 20th, 25th).
    """
    try:
        return await service.analyze_sip_date_performance(holding_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/simulate", response_model=schemas.SimulateInvestmentResponse)
async def simulate_investment(
    req: schemas.SimulateInvestmentRequest,
    current_user: User = Depends(get_current_user),
    service: WealthService = Depends()
):
    """
    Simulate a past investment to check "What If" returns.
    """
    try:
        return await service.simulate_historical_investment(
            req.scheme_code, 
            req.amount, 
            req.date,
            investment_type=req.investment_type,
            end_date=req.end_date
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/search-mutual-funds")
async def search_mutual_funds(
    q: str,
    current_user: User = Depends(get_current_user),
    service: WealthService = Depends()
):
    """Search mutual funds by name."""
    return await service.search_mutual_funds(q)


