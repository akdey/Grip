from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.assistant.schemas import AssistantQueryRequest, AssistantQueryResponse
from app.features.assistant.service import AssistantService

router = APIRouter()

@router.post("/query", response_model=AssistantQueryResponse)
async def query_assistant(
    payload: AssistantQueryRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Experimental Natural Language Financial Assistant.
    Translates user questions into secure, read-only PostgreSQL queries
    and returns exact matching transactions and summaries.
    Supports mode='llm' (default, pure Gemma 4) or mode='preset' (deterministic local fast path).
    """
    service = AssistantService(db)
    return await service.execute_query(payload.question, current_user.id, mode=payload.mode or "llm")
