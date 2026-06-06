from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging
import asyncio

from app.core.config import get_settings
from app.core.llm import get_llm_service

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


class GenerateRequest(BaseModel):
    prompt: str
    system_prompt: Optional[str] = "You are a helpful financial assistant."
    temperature: float = 0.7


class GenerateResponse(BaseModel):
    text: str


@router.post("/generate", response_model=GenerateResponse)
async def generate_text(
    request: GenerateRequest,
    x_grip_secret: Optional[str] = Header(None)
):
    """
    Internal endpoint for remote LLM generation.
    Used by GitHub Actions (or any external caller) to leverage the
    local LLM running on this HF Space, without loading the model again.
    Protected by X-Grip-Secret header matching GRIP_SECRET.
    """
    # Authenticate
    if not settings.GRIP_SECRET or x_grip_secret != settings.GRIP_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    llm = get_llm_service()

    # Call local engine directly — bypasses remote relay to avoid recursion
    if not llm.local_engine:
        raise HTTPException(status_code=503, detail="Local LLM engine not available on this instance.")

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            llm.local_engine.generate,
            request.prompt,
            request.system_prompt,
            request.temperature
        )
        if not result:
            raise HTTPException(status_code=503, detail="LLM returned empty response.")
        return GenerateResponse(text=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Internal /generate error: {e}")
        raise HTTPException(status_code=500, detail="Generation failed.")
