from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.core.llm import get_llm_service
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


class GenerateRequest(BaseModel):
    prompt: str
    system_prompt: Optional[str] = "You are a helpful financial assistant."
    temperature: Optional[float] = 0.8


class GenerateResponse(BaseModel):
    result: Optional[str]


@router.post("/generate", response_model=GenerateResponse)
async def generate(
    body: GenerateRequest,
    x_grip_secret: Optional[str] = Header(default=None),
):
    """
    Internal endpoint for calling the local LLM service.
    Protected by X-Grip-Secret header — only callable by internal services
    (e.g., GitHub Actions scheduler) that share the secret.
    """
    if not settings.GRIP_SECRET or x_grip_secret != settings.GRIP_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Grip-Secret header."
        )

    llm = get_llm_service()
    result = await llm.generate_response(
        prompt=body.prompt,
        system_prompt=body.system_prompt,
        temperature=body.temperature,
    )
    return GenerateResponse(result=result)
