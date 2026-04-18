import logging
import re
import httpx
import json
import asyncio
import os
import threading
from typing import Optional, Dict, Any, List
from app.core.config import get_settings

print(">>> LLM MODULE IMPORTED", flush=True)

# Global flag to track if llama-cpp is available and usable on this system.
HAS_LLAMA_CPP = False 
try:
    import llama_cpp
    HAS_LLAMA_CPP = True
except Exception:
    # We don't log here to avoid cluttering startup logs if the user is running 
    # in a environment where they explicitly didn't install it.
    pass

settings = get_settings()
logger = logging.getLogger(__name__)

class LocalLLMEngine:
    """Handles local execution of GGUF models using llama-cpp-python."""
    
    def __init__(self):
        self._model = None
        self._lock = threading.Lock()
        self.repo_id = settings.LOCAL_MODEL_REPO
        self.filename = settings.LOCAL_MODEL_FILE
        self.models_dir = settings.LOCAL_MODEL_DIR
        
    def _ensure_model(self):
        """Lazy load and potentially download the model. Thread-safe."""
        with self._lock:
            if self._model:
                return self._model
                
            try:
                from llama_cpp import Llama
                from huggingface_hub import hf_hub_download
            except Exception as e:
                logger.error(f"Cannot load local LLM engine (likely missing system dependencies for llama_cpp): {e}")
                return None
                
            try:
                # Create models directory if it doesn't exist
                os.makedirs(self.models_dir, exist_ok=True)
                
                # Check for model existence. Use absolute path for reliability in Docker containers.
                model_path = os.path.abspath(os.path.join(self.models_dir, self.filename))
                logger.info(f"LocalLLMEngine: Checking for model at {model_path}")
                
                if os.path.exists(model_path):
                    file_size = os.path.getsize(model_path)
                    logger.info(f"LocalLLMEngine: Model file found. Size: {file_size / (1024*1024):.2f} MB")
                    if file_size < 100 * 1024 * 1024: # Less than 100MB is likely a pointer/corrupted for a 1.7B model
                        logger.warning(f"LocalLLMEngine: Model file seems too small ({file_size} bytes). It might be an LFS pointer. Re-downloading...")
                        os.remove(model_path)
                
                if not os.path.exists(model_path):
                    logger.warning(f"LocalLLMEngine: Model not found at expected path or removed. Attempting download from {self.repo_id}...")
                    downloaded_path = hf_hub_download(
                        repo_id=self.repo_id,
                        filename=self.filename,
                        local_dir=self.models_dir
                    )
                    model_path = os.path.abspath(downloaded_path)
                    logger.info(f"LocalLLMEngine: Download complete. Size: {os.path.getsize(model_path) / (1024*1024):.2f} MB")
                
                # Initialize Llama-cpp with optimized context and caching
                # n_ctx: 2048 (default) - Sufficient for long emails + context
                # n_threads: 1 - Prevents CPU contention
                # logits_all: False - Saves memory
                self._model = Llama(
                    model_path=model_path,
                    n_ctx=settings.LOCAL_LLM_CONTEXT,
                    n_threads=1,
                    n_gpu_layers=0, # Force CPU
                    logits_all=False,
                    verbose=False
                )
                logger.info(f"Local LLM engine initialized (ctx: {settings.LOCAL_LLM_CONTEXT}, threads: 1).")
                return self._model
            except Exception as e:
                logger.error(f"Failed to initialize local LLM engine: {e}")
                return None

    def _strip_thoughts(self, text: str) -> str:
        """Removes internal thinking blocks from Gemma 4 output."""
        if not text:
            return text
        # Gemma 4 thought pattern: <|channel>thought ... <channel|>
        text = re.sub(r'<\|channel>thought.*?<channel\|>', '', text, flags=re.DOTALL)
        return text.strip()

    def generate(self, prompt: str, system_prompt: str, temperature: float) -> Optional[str]:
        """Generate response using the local model."""
        model = self._ensure_model()
        if not model:
            return None
            
        try:
            # Format prompt for Gemma 4
            formatted_prompt = f"<|turn>system\n{system_prompt} <turn|>\n<|turn>user\n{prompt} <turn|>\n<|turn>model\n"
            
            logger.debug(f"LocalLLMEngine: Starting inference with Gemma 4...")
            output = model(
                formatted_prompt,
                max_tokens=512, # Optimized for JSON response with more prompt headroom
                temperature=temperature,
                stop=["<turn|>", "<|turn>", "<|im_end|>", "<|endoftext|>"],
                echo=False
            )
            raw_text = output['choices'][0]['text'].strip()
            text = self._strip_thoughts(raw_text)
            logger.info(f"LocalLLMEngine: Inference complete. Generated {len(text)} characters (stripped thoughts).")
            return text
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
            # (re.compile(r'[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}'), '<UPI>'),  # Allow LLM to read UPI based merchants
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
        return HAS_LLAMA_CPP # or bool(self.groq_api_key)

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
        global HAS_LLAMA_CPP
        
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
                    logger.info(">>> LLM_ENGINE: Local (Gemma 4) success.")
                    return res
                # If we get here it means inference failed or engine is broken
            except Exception as e:
                # If it fails once with a severe error (like shared lib missing), we can disable it 
                # for the rest of this worker's lifecycle to stop log spam.
                if "shared object file" in str(e) or "libc" in str(e).lower():
                    HAS_LLAMA_CPP = False
                    logger.error(f">>> LLM_ENGINE: Fatal library error. Disabling local LLM: {e}")
                else:
                    logger.warning(f">>> LLM_ENGINE: Local engine runtime error: {e}")

        # 2. Try Groq (Fallback — external API, sanitize content)
        # if self.groq_api_key:
        #     logger.info(f">>> LLM_ENGINE: Falling back to Groq ({self.groq_model})...")
        #     sanitized_prompt = self._sanitize_for_external(prompt)
        #     result = await self._call_groq(sanitized_prompt, system_prompt, temperature, response_format, timeout)
        #     if result:
        #         logger.info(">>> LLM_ENGINE: Groq success.")
        #     return result
            
        logger.warning("Local LLM engine is unavailable. Groq fallback is disabled.")
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
                elif resp.status_code == 429:
                    logger.error(f"Groq API Rate Limit Reached (429). Falling back to Regex engine.")
                    return None
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
