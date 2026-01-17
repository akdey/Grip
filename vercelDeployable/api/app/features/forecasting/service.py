import logging
import pandas as pd
from decimal import Decimal
from typing import List
import json
import httpx

from app.core.config import get_settings

# Lazy import Prophet to avoid crashes if not installed/compiled
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    
logger = logging.getLogger(__name__)
settings = get_settings()

class ForecastingService:
    def __init__(self):
        self.lookahead_days = 30
        
    async def calculate_safe_to_spend(self, history_data: List[dict]) -> Decimal:
        """Forecast upcoming expenses for the next 30 days."""
        if not settings.USE_AI_FORECASTING:
            return Decimal("0.00")

        # Use Statistical Model (Prophet) if available
        if PROPHET_AVAILABLE:
            return self._calculate_prophet(history_data)
        
        # Otherwise use LLM (Groq) - lightweight and works on Vercel
        return await self._calculate_llm(history_data)

    def _calculate_prophet(self, history_data: List[dict]) -> Decimal:
        if not history_data or len(history_data) < 30:
             return Decimal("0.00")

        try:
            df = pd.DataFrame(history_data)
            df['ds'] = pd.to_datetime(df['ds'])
            
            m = Prophet()
            m.fit(df)
            
            future = m.make_future_dataframe(periods=self.lookahead_days)
            forecast = m.predict(future)
            
            last_date = df['ds'].max()
            future_mask = forecast['ds'] > last_date
            predicted_expenses = forecast[future_mask]['yhat'].sum()
            
            return Decimal(str(max(0, predicted_expenses)))

        except Exception as e:
            logger.error(f"Prophet forecasting error: {e}")
            return Decimal("0.00")

    async def _calculate_llm(self, history_data: List[dict]) -> Decimal:
        """Use Groq LLM to predict next 30 days based on summary trends."""
        if not settings.GROQ_API_KEY or not history_data:
            return Decimal("0.00")

        try:
            # Summarize history for the LLM to save tokens and avoid context limits
            history_summary = [
                {"date": d['ds'], "amount": float(d['y'])} 
                for d in history_data[-60:] # Last 60 days
            ]
            
            prompt = f"""
            Analyze the following 60-day daily expense history and predict the TOTAL expenses for the NEXT 30 days.
            Consider trends, seasonality, and average daily spend.
            
            History: {json.dumps(history_summary)}
            
            Return ONLY a JSON object with this key:
            - predicted_total: float
            """

            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": settings.GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "response_format": {"type": "json_object"},
                "temperature": 0.1
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload, timeout=15.0)
                
            if response.status_code == 200:
                result = response.json()['choices'][0]['message']['content']
                data = json.loads(result)
                return Decimal(str(max(0, data.get("predicted_total", 0))))
                
        except Exception as e:
            logger.error(f"LLM forecasting error: {e}")
            
        return Decimal("0.00")
