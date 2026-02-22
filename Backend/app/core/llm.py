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
        self.groq_api_key = settings.GROQ_API_KEY
        self.groq_model = settings.GROQ_MODEL
        self.groq_url = "https://api.groq.com/openai/v1/chat/completions"
        self.intelligence_url = settings.GRIP_HF_LLM_URL
        self.intelligence_token = settings.X_GRIP_HF_LLM_TOKEN

    @property
    def is_enabled(self) -> bool:
        """Check if the LLM service is configured and ready to use."""
        return bool(self.intelligence_url) or bool(self.groq_api_key)

    async def generate_response(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = "You are a helpful financial assistant.",
        temperature: float = 0.5,
        response_format: Optional[str] = None,
        timeout: float = 10.0
    ) -> Optional[str]:
        """Generic method to generate a response from the LLM, prioritizing HF Space."""
        
        # 1. Try Grip Intelligence Space (Primary)
        if self.intelligence_url:
            # Merge prompts for HF Space as it usually expects a single prompt string
            hf_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
            hf_res = await self._call_intelligence_engine(hf_prompt, timeout)
            if hf_res:
                return hf_res
            logger.info("Intelligence engine failed or returned empty. Falling back to Groq...")

        # 2. Try Groq (Fallback)
        if self.groq_api_key:
            return await self._call_groq(prompt, system_prompt, temperature, response_format, timeout)
            
        logger.warning("No LLM service (Intelligence or Groq) is configured and available.")
        return None

    async def _call_intelligence_engine(self, prompt: str, timeout: float) -> Optional[str]:
        """Call your custom Grip Intelligence engine on HF Spaces."""
        headers = {
            "X-Grip-HF-LLM-Auth-Token": self.intelligence_token,
            "Content-Type": "application/json"
        }
        payload = {"prompt": prompt}
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(self.intelligence_url, headers=headers, json=payload, timeout=timeout)
                if resp.status_code == 200:
                    content = resp.json().get('response')
                    return content if content else None
                else:
                    logger.error(f"Intelligence Engine Error ({resp.status_code}): {resp.text}")
                    return None
        except Exception as e:
            logger.error(f"Intelligence Engine Connection Error: {e}")
            return None

    async def _call_groq(
        self, 
        prompt: str, 
        system_prompt: str, 
        temperature: float, 
        response_format: Optional[str], 
        timeout: float
    ) -> Optional[str]:
        """Call the Groq API (Fallback provider)."""
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json"
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.groq_model,
            "messages": messages,
            "temperature": temperature
        }

        if response_format == "json_object":
            payload["response_format"] = {"type": "json_object"}

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(self.groq_url, headers=headers, json=payload, timeout=timeout)
                if resp.status_code == 200:
                    return resp.json()['choices'][0]['message']['content']
                else:
                    logger.error(f"Groq API Error ({resp.status_code}): {resp.text}")
                    return None
        except Exception as e:
            logger.error(f"Groq Connection Error: {e}")
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
            # Handle potential markdown code blocks in the response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
                
            return json.loads(content)
        except (json.JSONDecodeError, IndexError) as e:
            logger.error(f"LLM JSON Decode Error: {e}. Content: {content[:100]}...")
            return None

# Singleton-like instance
_llm_service = None

def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
