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
    print(">>> LLM_ENGINE: llama-cpp-python imported successfully.", flush=True)
except Exception as e:
    # Capturing the error to help debug HF Space deployment issues
    print(f">>> LLM_ENGINE: Failed to import llama-cpp-python: {e}", flush=True)
    pass

settings = get_settings()
logger = logging.getLogger(__name__)

class LocalLLMEngine:
    """Handles local execution of GGUF models using llama-cpp-python."""
    
    def __init__(self):
        self._model = None
        self._lock = threading.Lock()
        self._inference_lock = threading.Lock()
        self.repo_id = settings.LOCAL_MODEL_REPO
        self.filename = settings.LOCAL_MODEL_FILE
        # Anchor models_dir reliably to Backend/models or settings.LOCAL_MODEL_DIR
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        if os.path.isabs(settings.LOCAL_MODEL_DIR):
            self.models_dir = settings.LOCAL_MODEL_DIR
        else:
            self.models_dir = os.path.join(base_dir, settings.LOCAL_MODEL_DIR)
        
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
                
                # Check for model existence. Use absolute path for reliability
                model_path = os.path.abspath(os.path.join(self.models_dir, self.filename))
                logger.info(f"LocalLLMEngine: Checking for model at {model_path}")
                
                if os.path.exists(model_path):
                    file_size = os.path.getsize(model_path)
                    logger.info(f"LocalLLMEngine: Model file found. Size: {file_size / (1024*1024):.2f} MB")
                    if file_size < 100 * 1024 * 1024: # Less than 100MB is likely a pointer/corrupted
                        logger.warning(f"LocalLLMEngine: Model file seems too small ({file_size} bytes). Re-downloading...")
                        os.remove(model_path)
                
                if not os.path.exists(model_path):
                    logger.info(f"LocalLLMEngine: Model not found at '{model_path}'. Downloading from {self.repo_id}...")
                    downloaded_path = hf_hub_download(
                        repo_id=self.repo_id,
                        filename=self.filename,
                        local_dir=self.models_dir
                    )
                    model_path = os.path.abspath(downloaded_path)
                    logger.info(f"LocalLLMEngine: Download complete ({os.path.getsize(model_path) / (1024*1024):.2f} MB).")
                
                # Initialize Llama-cpp with optimized context and threading
                import multiprocessing
                import platform
                threads = max(2, multiprocessing.cpu_count())
                
                # Use Metal GPU acceleration on macOS for fast local inference; 0 for CPU containers
                gpu_layers = -1 if platform.system() == "Darwin" else 0
                
                try:
                    self._model = Llama(
                        model_path=model_path,
                        n_ctx=settings.LOCAL_LLM_CONTEXT,
                        n_threads=threads,
                        n_gpu_layers=gpu_layers,
                        logits_all=False,
                        flash_attn=False, # Disabled: prevents GGML SWA assertion crash on CPU
                        verbose=False
                    )
                except Exception as gpu_err:
                    logger.warning(f"Llama GPU offload init failed ({gpu_err}), falling back to CPU.")
                    self._model = Llama(
                        model_path=model_path,
                        n_ctx=settings.LOCAL_LLM_CONTEXT,
                        n_threads=threads,
                        n_gpu_layers=0,
                        logits_all=False,
                        flash_attn=False,
                        verbose=False
                    )

                # Attach KV RAM Cache for instant prompt prefix reuse across emails in a sync
                try:
                    from llama_cpp import LlamaRAMCache
                    self._model.set_cache(LlamaRAMCache(capacity_bytes=256 * 1024 * 1024))
                    logger.info("LocalLLMEngine: Attached LlamaRAMCache for KV prefix caching.")
                except Exception as cache_err:
                    logger.debug(f"LocalLLMEngine: KV cache setup skipped: {cache_err}")

                logger.info(f"Local LLM engine initialized (ctx: {settings.LOCAL_LLM_CONTEXT}, threads: {threads}, gpu_layers: {gpu_layers}).")
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
            
        # Strictly serialize inference — never allow concurrent forward passes in llama.cpp
        if not self._inference_lock.acquire(blocking=True, timeout=120):
            logger.error("LocalLLMEngine: Engine is busy with another evaluation. Skipping concurrent collision.")
            return None

        try:
            logger.debug(f"LocalLLMEngine: Starting inference with Gemma 4...")
            import time
            start_t = time.perf_counter()
            
            # Use native chat completion API to handle GGUF chat template safely
            try:
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})

                output = model.create_chat_completion(
                    messages=messages,
                    max_tokens=140, # 140 tokens is plenty for financial JSON extraction
                    temperature=temperature
                )
                raw_text = output['choices'][0]['message']['content'].strip()
            except Exception as chat_err:
                logger.warning(f"LocalLLMEngine: create_chat_completion failed ({chat_err}), falling back to direct prompt execution.")
                formatted_prompt = f"System: {system_prompt}\nUser: {prompt}\nAssistant:"
                output = model(
                    formatted_prompt,
                    max_tokens=140,
                    temperature=temperature,
                    echo=False
                )
                raw_text = output['choices'][0]['text'].strip()

            inf_time = (time.perf_counter() - start_t) * 1000
            text = self._strip_thoughts(raw_text)
            logger.info(f"⚡ [Gemma 4] Inference complete in {inf_time:.0f}ms (generated {len(text)} chars)")
            return text
        except Exception as e:
            logger.error(f"Error during local LLM inference: {e}")
            return None
        finally:
            self._inference_lock.release()

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
        
        # 1. Local Engine (100% Local Gemma 4 via llama-cpp-python)
        if HAS_LLAMA_CPP:
            try:
                loop = asyncio.get_event_loop()
                res = await asyncio.wait_for(
                    loop.run_in_executor(
                        None, 
                        self.local_engine.generate, 
                        prompt, 
                        system_prompt, 
                        temperature
                    ),
                    timeout=timeout
                )
                if res:
                    logger.info(">>> LLM_ENGINE: Local (Gemma 4) success.")
                    return res
            except asyncio.TimeoutError:
                logger.warning(f">>> LLM_ENGINE: Local engine timed out after {timeout}s.")
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
            logger.error(f"LLM JSON Decode Error: {e}")
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
