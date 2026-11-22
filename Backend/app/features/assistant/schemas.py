from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class AssistantQueryRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=500, description="Natural language question about transactions")

class AssistantQueryResponse(BaseModel):
    question: str
    answer: str
    sql_query: str
    row_count: int
    results: List[Dict[str, Any]]
    execution_time_ms: float
    engine_used: str = "GEMMA_4"  # 'PRESET_FAST_PATH' or 'GEMMA_4'
