"""
==============================================================================
ADAPTIVE INFRASTRUCTURE LAYER (Transient Band-Aid)
------------------------------------------------------------------------------
Role: Pluggable Cache Strategy Adapter for Local LLM Execution
Target Environment: Hugging Face Spaces (CPU-only, 2 shared vCPUs)

Problem Statement:
- Evaluating a ~1,000 token prompt prefix on 2 vCPUs without GPU takes 60-120s.
- The standard LlamaRAMCache is an unpartitioned LRU queue of 256MB.
- Background tasks (budget forecasting, anomaly notifications) and batch boundaries
  frequently evict the financial extraction prompt from memory, forcing cold starts.

Solution Provided by this Adapter:
- Pins pre-computed KV attention states per designated task (e.g. TRANSACTION_EXTRACTION)
  in memory so they can NEVER be evicted by other tasks or memory limits.
- Persists pinned task states to disk (`models/kv_cache/{task}.state`) so that cold
  container wakeups load the compiled KV tensors in <100ms instead of 2 minutes on CPU.
- Other tasks (forecasting, notifications) run in isolated ephemeral contexts without
  contaminating or degrading the pinned task prefix.

Swapping Out / Decommissioning:
- When migrating to a dedicated GPU (vLLM / Ollama server) or Cloud API (Gemini/Groq),
  set `settings.ENABLE_TRANSIENT_KV_ADAPTER = False` or switch the adapter to
  `PassthroughCacheAdapter()`. Zero business logic changes are needed.
==============================================================================
"""

import os
import sys
import pickle
import logging
from abc import ABC, abstractmethod
from collections import OrderedDict
from typing import Optional, Sequence, Tuple, Dict, Any

logger = logging.getLogger(__name__)

# Check for llama_cpp availability
HAS_LLAMA_CPP = False
BaseLlamaCacheType = object
try:
    import llama_cpp
    from llama_cpp.llama_cache import BaseLlamaCache
    BaseLlamaCacheType = BaseLlamaCache
    HAS_LLAMA_CPP = True
except Exception:
    pass


class BaseLLMCacheAdapter(ABC):
    """Abstract contract for LLM Cache Adapters."""
    
    @abstractmethod
    def attach_to_model(self, model: Any) -> None:
        """Attach cache strategy to the llama.cpp model instance."""
        pass

    @abstractmethod
    def pin_task_prefix(self, task_name: str, token_ids: Sequence[int], state: Any) -> None:
        """Pin a compiled KV state for a specific high-frequency task."""
        pass

    @abstractmethod
    def is_task_pinned(self, task_name: str, tokens: Optional[Sequence[int]] = None) -> bool:
        """Check if a task's prefix state is currently pinned and warm."""
        pass


class PassthroughCacheAdapter(BaseLLMCacheAdapter):
    """
    No-op / Null Cache Adapter.
    Used when running on GPU servers, external APIs (Groq/Gemini), or when the
    transient CPU band-aid is intentionally decommissioned.
    """
    def attach_to_model(self, model: Any) -> None:
        logger.info("CacheAdapter: Passthrough mode active (no local KV caching).")

    def pin_task_prefix(self, task_name: str, token_ids: Sequence[int], state: Any) -> None:
        pass

    def is_task_pinned(self, task_name: str, tokens: Optional[Sequence[int]] = None) -> bool:
        return False


if HAS_LLAMA_CPP:
    class TaskAwarePrefixCache(BaseLlamaCache):
        """
        Adaptive llama.cpp Cache Engine that partitions memory into:
        1. Pinned Task Prefix Store (Protected from LRU eviction & persisted to disk)
        2. Ephemeral General Cache (Standard LRU for ad-hoc prompts, e.g. forecasting)
        """
        def __init__(self, cache_dir: str = "models/kv_cache", capacity_bytes: int = (512 * 1024 * 1024)):
            super().__init__(capacity_bytes=capacity_bytes)
            self.cache_dir = cache_dir
            self.capacity_bytes = capacity_bytes
            
            # 1. Pinned Task KV Store: task_name -> (token_tuple, LlamaState)
            self._pinned_by_task: Dict[str, Tuple[Tuple[int, ...], Any]] = {}
            # Index of token_tuple -> LlamaState for fast longest-prefix matching
            self._pinned_by_tokens: Dict[Tuple[int, ...], Any] = {}
            
            # 2. Ephemeral LRU Cache for general completions
            self._ephemeral_cache: OrderedDict[Tuple[int, ...], Any] = OrderedDict()
            
            os.makedirs(self.cache_dir, exist_ok=True)
            self._load_persisted_states()

        @property
        def cache_size(self) -> int:
            """Sum of ephemeral cache states (pinned states are accounted separately)."""
            return sum([getattr(state, 'llama_state_size', 0) for state in self._ephemeral_cache.values()])

        def _load_persisted_states(self) -> None:
            """Load any pre-saved task prefix state files from disk on container boot."""
            if not os.path.isdir(self.cache_dir):
                return
            for fname in os.listdir(self.cache_dir):
                if fname.endswith(".state"):
                    task_name = fname[:-6]
                    fpath = os.path.join(self.cache_dir, fname)
                    try:
                        with open(fpath, "rb") as f:
                            saved_data = pickle.load(f)
                            tokens = tuple(saved_data.get("tokens", ()))
                            state = saved_data.get("state")
                            if tokens and state:
                                self._pinned_by_task[task_name] = (tokens, state)
                                self._pinned_by_tokens[tokens] = state
                                logger.info(f"⚡ [TaskCacheAdapter] Loaded persisted KV state for task '{task_name}' ({len(tokens)} tokens) from disk.")
                    except Exception as err:
                        logger.warning(f"[TaskCacheAdapter] Failed to load persisted state {fname}: {err}")

        def pin_task(self, task_name: str, tokens: Sequence[int], state: Any) -> None:
            """Pin a compiled KV state in memory and persist it to disk."""
            token_tuple = tuple(tokens)
            # Evict any previous mapping for this task name
            if task_name in self._pinned_by_task:
                old_tokens = self._pinned_by_task[task_name][0]
                self._pinned_by_tokens.pop(old_tokens, None)

            self._pinned_by_task[task_name] = (token_tuple, state)
            self._pinned_by_tokens[token_tuple] = state
            logger.info(f"🔒 [TaskCacheAdapter] Pinned KV prefix for task '{task_name}' ({len(token_tuple)} tokens) in memory.")
            
            # Persist to disk
            fpath = os.path.join(self.cache_dir, f"{task_name}.state")
            try:
                with open(fpath, "wb") as f:
                    pickle.dump({"tokens": token_tuple, "state": state}, f)
                logger.info(f"💾 [TaskCacheAdapter] Persisted KV prefix for task '{task_name}' to {fpath}.")
            except Exception as e:
                logger.warning(f"[TaskCacheAdapter] Could not persist state to {fpath}: {e}")

        def is_pinned(self, task_name: str, tokens: Optional[Sequence[int]] = None) -> bool:
            if task_name not in self._pinned_by_task:
                return False
            if tokens is not None:
                pinned_tokens = self._pinned_by_task[task_name][0]
                return tuple(tokens) == pinned_tokens
            return True

        def _find_longest_prefix_key(self, key: Tuple[int, ...]) -> Optional[Tuple[int, ...]]:
            """
            Search for matching prompt prefix:
            Tier 1: Check Pinned Task Prefixes first (Highest Priority - 100% immune to eviction).
            Tier 2: Check Ephemeral LRU cache.
            """
            min_len = 0
            best_key = None

            # 1. Check Pinned Task prefixes
            for k in self._pinned_by_tokens.keys():
                prefix_len = llama_cpp.llama.Llama.longest_token_prefix(k, key)
                if prefix_len > min_len:
                    min_len = prefix_len
                    best_key = k

            if best_key is not None:
                return best_key

            # 2. Check Ephemeral LRU cache
            for k in self._ephemeral_cache.keys():
                prefix_len = llama_cpp.llama.Llama.longest_token_prefix(k, key)
                if prefix_len > min_len:
                    min_len = prefix_len
                    best_key = k

            return best_key

        def __getitem__(self, key: Sequence[int]) -> Any:
            key_tuple = tuple(key)
            matched_key = self._find_longest_prefix_key(key_tuple)
            if matched_key is None:
                raise KeyError("Key not found in TaskAwarePrefixCache")

            # Check pinned store
            if matched_key in self._pinned_by_tokens:
                return self._pinned_by_tokens[matched_key]

            # Check ephemeral store
            val = self._ephemeral_cache[matched_key]
            self._ephemeral_cache.move_to_end(matched_key)
            return val

        def __contains__(self, key: Sequence[int]) -> bool:
            return self._find_longest_prefix_key(tuple(key)) is not None

        def __setitem__(self, key: Sequence[int], value: Any) -> None:
            key_tuple = tuple(key)
            
            # We never store dynamic single-use completions into pinned storage;
            # they go to the ephemeral LRU pool.
            if key_tuple in self._ephemeral_cache:
                del self._ephemeral_cache[key_tuple]
            self._ephemeral_cache[key_tuple] = value

            # Enforce LRU eviction ONLY on ephemeral entries
            while self.cache_size > self.capacity_bytes and len(self._ephemeral_cache) > 0:
                self._ephemeral_cache.popitem(last=False)


class TransientTaskPrefixAdapter(BaseLLMCacheAdapter):
    """
    The concrete Adaptive Infrastructure Layer.
    Instantiates and attaches the TaskAwarePrefixCache to llama.cpp.
    """
    def __init__(self, cache_dir: str = "models/kv_cache", capacity_bytes: int = 512 * 1024 * 1024):
        self.cache_dir = cache_dir
        self.capacity_bytes = capacity_bytes
        self._cache_instance: Optional[Any] = None

    def attach_to_model(self, model: Any) -> None:
        if not HAS_LLAMA_CPP:
            logger.warning("[TaskCacheAdapter] llama-cpp not installed. Skipping cache attachment.")
            return

        try:
            self._cache_instance = TaskAwarePrefixCache(
                cache_dir=self.cache_dir,
                capacity_bytes=self.capacity_bytes
            )
            model.set_cache(self._cache_instance)
            logger.info(f"⚡ [TaskCacheAdapter] Attached TaskAwarePrefixCache (dir='{self.cache_dir}', capacity=512MB).")
        except Exception as err:
            logger.error(f"[TaskCacheAdapter] Failed to attach TaskAwarePrefixCache: {err}")

    def pin_task_prefix(self, task_name: str, token_ids: Sequence[int], state: Any) -> None:
        if self._cache_instance and hasattr(self._cache_instance, 'pin_task'):
            self._cache_instance.pin_task(task_name, token_ids, state)

    def is_task_pinned(self, task_name: str, tokens: Optional[Sequence[int]] = None) -> bool:
        if self._cache_instance and hasattr(self._cache_instance, 'is_pinned'):
            return self._cache_instance.is_pinned(task_name, tokens)
        return False


def get_task_cache_adapter() -> BaseLLMCacheAdapter:
    """
    Factory function for the Cache Adapter.
    Controls whether the transient band-aid is active or bypassed.
    """
    if not HAS_LLAMA_CPP:
        return PassthroughCacheAdapter()
    return TransientTaskPrefixAdapter()
