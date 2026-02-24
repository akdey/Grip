import logging
import re
import httpx
import json
import asyncio
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
        
        # PII patterns for sanitizing content before sending to external APIs
        self._pii_patterns = [
            (re.compile(r'[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}'), '<UPI>'),
            (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), '<EMAIL>'),
            (re.compile(r'(?:\+?91|0)?[6-9]\d{9}'), '<PHONE>'),
            (re.compile(r'(?:\d[ -]*?){12,19}'), '<CARD>'),
            (re.compile(r'[Xx]+\d{3,6}'), '<ACCOUNT>'),
            (re.compile(r'[A-Z]{5}[0-9]{4}[A-Z]{1}'), '<PAN>'),
            (re.compile(r'\d{4}\s\d{4}\s\d{4}'), '<AADHAAR>'),
        ]

    @property
    def is_enabled(self) -> bool:
        """Check if the LLM service is configured and ready to use."""
        return bool(self.intelligence_url) or bool(self.groq_api_key)

    def _sanitize_for_external(self, text: str) -> str:
        """Extra PII scrub before sending to any external/third-party LLM API."""
        if not text:
            return text
        # Strip names from greetings
        text = re.sub(r'(?i)(Dear|Hello|Hi)\s+[A-Za-z\s]+,', r'\1 Customer,', text)
        for pattern, label in self._pii_patterns:
            text = pattern.sub(label, text)
        return text

    async def generate_response(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = "You are a helpful financial assistant.",
        temperature: float = 0.5,
        response_format: Optional[str] = None,
        timeout: float = 90.0
    ) -> Optional[str]:
        """Generic method to generate a response from the LLM, prioritizing custom Intelligence Space."""
        
        # 1. Try Grip Intelligence Space (Primary — self-hosted, no PII concern)
        if self.intelligence_url:
            hf_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
            hf_res = await self._call_intelligence_engine(hf_prompt, timeout)
            if hf_res:
                return hf_res
            logger.warning("Intelligence engine failed or returned empty. Falling back to Groq...")

        # 2. Try Groq (Fallback — external API, sanitize content)
        if self.groq_api_key:
            sanitized_prompt = self._sanitize_for_external(prompt)
            return await self._call_groq(sanitized_prompt, system_prompt, temperature, response_format, timeout)
            
        logger.warning("No LLM service (Intelligence or Groq) is configured and available.")
        return None

    async def _call_intelligence_engine(self, prompt: str, timeout: float, max_retries: int = 0) -> Optional[str]:
        """Call your custom Grip Intelligence engine on HF Spaces."""
        headers = {
            "X-Grip-HF-LLM-Auth-Token": self.intelligence_token,
            "Content-Type": "application/json"
        }
        payload = {"prompt": prompt}
        
        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(self.intelligence_url, headers=headers, json=payload, timeout=timeout)
                    if resp.status_code == 200:
                        content = resp.json().get('response')
                        return content if content else None
                    elif resp.status_code >= 500 and attempt < max_retries:
                        logger.warning(f"Intelligence Engine returned {resp.status_code}, retrying in 5s (attempt {attempt + 1}/{max_retries + 1})")
                        await asyncio.sleep(5)
                        continue
                    else:
                        logger.error(f"Intelligence Engine Error ({resp.status_code}): {resp.text[:200]}")
                        return None
            except httpx.TimeoutException:
                if attempt < max_retries:
                    logger.warning(f"Intelligence Engine timed out after {timeout}s, retrying (attempt {attempt + 1}/{max_retries + 1})")
                    await asyncio.sleep(3)
                    continue
                logger.error(f"Intelligence Engine timed out after {timeout}s (all retries exhausted)")
                return None
            except Exception as e:
                logger.error(f"Intelligence Engine Connection Error: {type(e).__name__}: {e}")
                return None
        return None

    async def _call_groq(
        self, 
        prompt: str, 
        system_prompt: str, 
        temperature: float, 
        response_format: Optional[str], 
        timeout: float
    ) -> Optional[str]:
        """Call the Groq API (Fallback provider). Content must be pre-sanitized."""
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
                    logger.error(f"Groq API Error ({resp.status_code}): {resp.text[:200]}")
                    return None
        except Exception as e:
            logger.error(f"Groq Connection Error: {type(e).__name__}: {e}")
            return None

    async def generate_json(
        self, 
        prompt: str, 
        system_prompt: Optional[str] = "You are a financial intelligence engine. Always output valid JSON.",
        temperature: float = 0.2,
        timeout: float = 30.0
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
