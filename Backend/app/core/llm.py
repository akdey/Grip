import logging
import httpx
import json
from typing import Optional, Dict, Any, List
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class LLMService:
    """Centralized service for Large Language Model interactions."""
    
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"

    @property
    def is_enabled(self) -> bool:
        """Check if the LLM service is configured and ready to use."""
        return bool(self.api_key)

    async def generate_response(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = "You are a helpful financial assistant.",
        temperature: float = 0.5,
        response_format: Optional[str] = None,
        timeout: float = 10.0
    ) -> Optional[str]:
        """Generic method to generate a response from the LLM."""
        if not self.api_key:
            logger.warning("LLM API Key not set.")
            return None

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature
        }

        if response_format == "json_object":
            payload["response_format"] = {"type": "json_object"}

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(self.base_url, headers=headers, json=payload, timeout=timeout)
                if resp.status_code == 200:
                    return resp.json()['choices'][0]['message']['content']
                else:
                    logger.error(f"LLM API Error ({resp.status_code}): {resp.text}")
                    return None
        except Exception as e:
            logger.error(f"LLM Connection Error: {e}")
            return None

    async def generate_json(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = "You are a financial intelligence engine. Always output valid JSON.",
        temperature: float = 0.2,
        timeout: float = 15.0
    ) -> Optional[Dict[str, Any]]:
        """Method specifically for JSON-structured responses."""
        content = await self.generate_response(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            response_format="json_object",
            timeout=timeout
        )
        
        if not content:
            return None
            
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"LLM JSON Decode Error: {e}")
            return None

# Singleton-like instance
_llm_service = None

def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
