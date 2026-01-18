from typing import Annotated, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.goals.schemas import GoalCreate, GoalResponse, FeasibilityCheck
from app.features.goals.service import GoalService

router = APIRouter()

@router.post("/feasibility", response_model=FeasibilityCheck)
async def check_goal_feasibility(
    goal_data: GoalCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[GoalService, Depends()]
):
    return await service.check_feasibility(db, current_user.id, goal_data)

@router.post("/", response_model=GoalResponse)
async def create_goal(
    goal_data: GoalCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[GoalService, Depends()]
):
    return await service.create_goal(db, current_user.id, goal_data)

@router.get("/", response_model=List[GoalResponse])
async def get_my_goals(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[GoalService, Depends()]
):
    return await service.get_active_goals(db, current_user.id)

@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    service: Annotated[GoalService, Depends()]
):
    await service.delete_goal(db, current_user.id, goal_id)
