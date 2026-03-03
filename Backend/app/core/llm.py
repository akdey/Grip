import logging
import re
import httpx
import json
import asyncio
import os
from typing import Optional, Dict, Any, List
from app.core.config import get_settings

# Attempt to import llama-cpp-python. 
# It might fail if not installed or on unsupported hardware.
try:
    from llama_cpp import Llama
    from huggingface_hub import hf_hub_download
    HAS_LLAMA_CPP = True
except ImportError:
    HAS_LLAMA_CPP = False

settings = get_settings()
logger = logging.getLogger(__name__)

class LocalLLMEngine:
    """Handles local execution of GGUF models using llama-cpp-python."""
    
    def __init__(self):
        self._model = None
        self.repo_id = settings.LOCAL_MODEL_REPO
        self.filename = settings.LOCAL_MODEL_FILE
        self.models_dir = settings.LOCAL_MODEL_DIR
        
    def _ensure_model(self) -> Optional[Llama]:
        """Lazy load and potentially download the model."""
        if self._model:
            return self._model
            
        if not HAS_LLAMA_CPP:
            logger.error("llama-cpp-python not installed. Cannot use local LLM.")
            return None
            
        try:
            # Create models directory if it doesn't exist
            os.makedirs(self.models_dir, exist_ok=True)
            
            # Download model if not exists
            model_path = os.path.join(self.models_dir, self.filename)
            if not os.path.exists(model_path):
                logger.info(f"Downloading model {self.filename} from {self.repo_id}...")
                model_path = hf_hub_download(
                    repo_id=self.repo_id,
                    filename=self.filename,
                    local_dir=self.models_dir
                )
            
            # Initialize Llama-cpp
            # Using a smaller context window (2048) and low n_threads for resource-constrained envs
            self._model = Llama(
                model_path=model_path,
                n_ctx=2048,
                n_threads=os.cpu_count() or 2,
                n_gpu_layers=0, # Force CPU for HF Free Tier compat
                verbose=False
            )
            logger.info("Local LLM engine initialized successfully.")
            return self._model
        except Exception as e:
            logger.error(f"Failed to initialize local LLM engine: {e}")
            return None

    def generate(self, prompt: str, system_prompt: str, temperature: float) -> Optional[str]:
        """Generate response using the local model."""
        model = self._ensure_model()
        if not model:
            return None
            
        try:
            # Format prompt for Phi-3 (Instruct template)
            # <|system|> system_prompt <|end|> <|user|> prompt <|end|> <|assistant|>
            formatted_prompt = f"<|system|>\n{system_prompt}<|end|>\n<|user|>\n{prompt}<|end|>\n<|assistant|>\n"
            
            output = model(
                formatted_prompt,
                max_tokens=512,
                temperature=temperature,
                stop=["<|end|>", "</s>"],
                echo=False
            )
            return output['choices'][0]['text'].strip()
        except Exception as e:
            logger.error(f"Error during local LLM inference: {e}")
            return None

class LLMService:
    """Centralized service for Large Language Model interactions."""
    
    def __init__(self):
        self.groq_api_key = settings.GROQ_API_KEY
        self.groq_model = settings.GROQ_MODEL
        self.groq_url = "https://api.groq.com/openai/v1/chat/completions"
        self.local_engine = LocalLLMEngine()
        
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
        """Check if any LLM service is available."""
        return HAS_LLAMA_CPP or bool(self.groq_api_key)

    def _sanitize_for_external(self, text: str) -> str:
        """Extra PII scrub before sending to any external/third-party LLM API."""
        if not text:
            return text
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
        timeout: float = 120.0 # Increased timeout for local inference
    ) -> Optional[str]:
        """Generic method to generate a response, prioritizing local execution."""
        
        # 1. Try Local Engine (Primary — high privacy, no costs)
        if HAS_LLAMA_CPP:
            # We run in a threadpool to avoid blocking the event loop
            try:
                loop = asyncio.get_event_loop()
                res = await loop.run_in_executor(
                    None, 
                    self.local_engine.generate, 
                    prompt, 
                    system_prompt, 
                    temperature
                )
                if res:
                    return res
                logger.warning("Local engine failed to produce a response.")
            except Exception as e:
                logger.warning(f"Local engine execution error: {e}")

        # 2. Try Groq (Fallback — external API, sanitize content)
        if self.groq_api_key:
            logger.info("Attempting Groq fallback...")
            sanitized_prompt = self._sanitize_for_external(prompt)
            return await self._call_groq(sanitized_prompt, system_prompt, temperature, response_format, timeout)
            
        logger.warning("No LLM service (Local or Groq) is available.")
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
        system_prompt: Optional[str] = "You are a financial intelligence engine. Always output valid JSON objects.",
        temperature: float = 0.2,
        timeout: float = 60.0
    ) -> Optional[Dict[str, Any]]:
        """Method specifically for JSON responses with robust parsing."""
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
            json_match = re.search(r'(\{.*\})', content, re.DOTALL)
            if json_match:
                content = json_match.group(1)
            
            content = content.strip().replace('```json', '').replace('```', '').strip()
            return json.loads(content)
        except (json.JSONDecodeError, IndexError) as e:
            logger.error(f"LLM JSON Decode Error: {e}. Content: {content[:200]}...")
            try:
                # Last resort cleanup
                cleaned = re.sub(r',\s*([\]\}])', r'\1', content)
                return json.loads(cleaned)
            except Exception:
                return None

# Singleton-like instance
_llm_service = None

def get_llm_service() -> LLMService:
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
