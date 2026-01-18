import logging
from decimal import Decimal
from typing import List
import json
import httpx

from app.core.config import get_settings

# Lazy import Prophet to avoid crashes if not installed/compiled
# Prophet is used only if manually installed (not available on Vercel)
try:
    from prophet import Prophet
    import pandas as pd
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    
logger = logging.getLogger(__name__)
settings = get_settings()

from datetime import date, timedelta
from app.features.forecasting.schemas import ForecastResponse

import calendar

class ForecastingService:
    def __init__(self):
        pass
        
    async def calculate_safe_to_spend(self, history_data: List[dict], category_history: List[dict]) -> ForecastResponse:
        """Forecast upcoming expenses for the remainder of the current month."""
        today = date.today()
        # Get last day of current month
        _, last_day = calendar.monthrange(today.year, today.month)
        end_date = date(today.year, today.month, last_day)
        
        # Calculate days remaining (inclusive of today)
        days_to_predict = (end_date - today).days + 1
        
        # Format time frame string
        if days_to_predict == 1:
             time_frame_str = f"Today ({today.strftime('%b %d')})"
        else:
             time_frame_str = f"Rest of {today.strftime('%B')} ({days_to_predict} days)"
        
        # LOGIC:
        # If USE_AI_FORECASTING is True AND Prophet is available -> Use Prophet for Number + LLM for Breakdown
        # If USE_AI_FORECASTING is False (or Prophet missing) -> Use Groq (LLM) for EVERYTHING
        
        use_prophet = settings.USE_AI_FORECASTING and PROPHET_AVAILABLE
        
        if use_prophet:
            return await self._calculate_prophet(history_data, category_history, time_frame_str, days_to_predict)
        
        # Fallback to LLM (Groq)
        return await self._calculate_llm(history_data, category_history, time_frame_str, days_to_predict)

    async def _calculate_prophet(self, history_data: List[dict], category_history: List[dict], time_frame: str, days: int) -> ForecastResponse:
        default_response = ForecastResponse(
            amount=Decimal("0.00"), 
            reason="Insufficient data for statistical modeling.", 
            time_frame=time_frame,
            confidence="low"
        )
        
        if not history_data or len(history_data) < 10: # Lower threshold since we might be late in month
             return default_response

        try:
            # 1. Calculate Total Amount using Prophet
            df = pd.DataFrame(history_data)
            df['ds'] = pd.to_datetime(df['ds'])
            
            m = Prophet()
            m.fit(df)
            
            # Predict for N days
            future = m.make_future_dataframe(periods=days)
            forecast = m.predict(future)
            
            last_date = df['ds'].max()
            future_mask = forecast['ds'] > last_date
            predicted_expenses = forecast[future_mask]['yhat'].sum()
            
            amount = Decimal(str(max(0, predicted_expenses)))
            
            # 2. Get Breakdown & Reason from LLM (using the Prophet Number as context)
            if settings.GROQ_API_KEY:
                llm_response = await self._get_llm_breakdown(category_history, float(amount), days)
                return ForecastResponse(
                    amount=amount,
                    reason=llm_response.get("reason", "Statistical forecast based on historical trends."),
                    time_frame=time_frame,
                    confidence="high",
                    breakdown=llm_response.get("breakdown", [])
                )
            
            return ForecastResponse(
                amount=amount,
                reason=f"Calculated using additive regression model for the remaining {days} days.",
                time_frame=time_frame,
                confidence="high",
                breakdown=[]
            )

        except Exception as e:
            logger.error(f"Prophet forecasting error: {e}")
            return default_response

    async def _calculate_llm(self, history_data: List[dict], category_history: List[dict], time_frame: str, days: int) -> ForecastResponse:
        """Use Groq LLM to predict remaining month expenses."""
        default_response = ForecastResponse(
            amount=Decimal("0.00"), 
            reason="AI service unavailable.", 
            time_frame=time_frame,
            confidence="low"
        )

        if not settings.GROQ_API_KEY or not history_data:
            return default_response

        try:
            # Prepare context
            history_summary = [
                {"date": d['ds'], "amount": float(d['y'])} 
                for d in history_data[-60:] # Last 60 days
            ]
            
            prompt = f"""
            Analyze the following 60-day daily expense history and CATEGORY breakdown.
            Predict the TOTAL expenses for the REMAINING {days} DAYS of the current month.
            Consider end-of-month bills (Rent, subscriptions) if they haven't occurred yet.
            
            Daily History (Last 60d): {json.dumps(history_summary)}
            Category Totals (Last 90d): {json.dumps(category_history)}
            
            Return ONLY a JSON object with these keys:
            - predicted_total: float
            - reason: string (Short explanation focusing on end-of-month liabilities or trends)
            - breakdown: list of objects {{ "category": string, "predicted_amount": float, "reason": string }}
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
                response = await client.post(url, headers=headers, json=payload, timeout=20.0)
                
            if response.status_code == 200:
                result = response.json()['choices'][0]['message']['content']
                data = json.loads(result)
                
                return ForecastResponse(
                    amount=Decimal(str(max(0, data.get("predicted_total", 0)))),
                    reason=data.get("reason", "Based on analysis of recent spending trends."),
                    time_frame=time_frame,
                    confidence="medium",
                    breakdown=data.get("breakdown", [])
                )
                
        except Exception as e:
            logger.error(f"LLM forecasting error: {e}")
            
        return default_response

    async def _get_llm_breakdown(self, category_history: List[dict], total_forecast: float, days: int) -> dict:
        """Helper to get just the breakdown and reason from LLM, given a known total."""
        try:
            prompt = f"""
            Given the historical category spending and a STATISTICALLY FORECASTED total of {total_forecast} 
            for the REMAINING {days} DAYS of the month:
            1. Allocate the forecasted total to categories based on history (considering end-of-month dues).
            2. Explain the forecast trend in 1 sentence.
            
            Category History (90d): {json.dumps(category_history)}
            
            Return ONLY a JSON object:
            {{
                "reason": "string",
                "breakdown": [ {{ "category": "string", "predicted_amount": float, "reason": "string" }} ]
            }}
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
                response = await client.post(url, headers=headers, json=payload, timeout=10.0)
                
            if response.status_code == 200:
                result = response.json()['choices'][0]['message']['content']
                return json.loads(result)
        except Exception as e:
            logger.error(f"LLM breakdown error: {e}")
            
        return {"reason": "Statistical forecast.", "breakdown": []}

    async def predict_discretionary_buffer(self, history_data: List[dict], buffer_days: int = 7) -> dict:
        """
        Predict discretionary spending for the next N days using AI.
        Returns: {
            "predicted_amount": Decimal,
            "confidence": str,
            "range_low": Decimal,
            "range_high": Decimal,
            "method": str
        }
        """
        default_result = {
            "predicted_amount": Decimal("500"),  # Minimum fallback
            "confidence": "low",
            "range_low": Decimal("500"),
            "range_high": Decimal("500"),
            "method": "fallback"
        }
        
        if not history_data or len(history_data) < 7:
            return default_result
        
        use_prophet = settings.USE_AI_FORECASTING and PROPHET_AVAILABLE
        
        try:
            if use_prophet:
                # Use Prophet for prediction
                df = pd.DataFrame(history_data)
                df['ds'] = pd.to_datetime(df['ds'])
                
                m = Prophet(interval_width=0.8)  # 80% confidence interval
                m.fit(df)
                
                # Predict for buffer_days
                future = m.make_future_dataframe(periods=buffer_days)
                forecast = m.predict(future)
                
                # Get predictions for future days only
                last_date = df['ds'].max()
                future_mask = forecast['ds'] > last_date
                future_forecast = forecast[future_mask]
                
                predicted_total = max(0, future_forecast['yhat'].sum())
                range_low = max(0, future_forecast['yhat_lower'].sum())
                range_high = max(0, future_forecast['yhat_upper'].sum())
                
                return {
                    "predicted_amount": Decimal(str(predicted_total)),
                    "confidence": "high",
                    "range_low": Decimal(str(range_low)),
                    "range_high": Decimal(str(range_high)),
                    "method": "prophet"
                }
            
            elif settings.GROQ_API_KEY:
                # Use LLM for prediction
                history_summary = [
                    {"date": d['ds'], "amount": float(d['y'])} 
                    for d in history_data[-30:]  # Last 30 days
                ]
                
                prompt = f"""
                Analyze the following 30-day DISCRETIONARY expense history (Food, Shopping, Entertainment, Transport, etc.).
                Predict the TOTAL discretionary spending for the NEXT {buffer_days} DAYS.
                
                Daily History: {json.dumps(history_summary)}
                
                Consider:
                - Day of week patterns (weekends vs weekdays)
                - Recent trends
                - Typical daily variation
                
                Return ONLY a JSON object:
                {{
                    "predicted_total": float,
                    "confidence_low": float,
                    "confidence_high": float
                }}
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
                    response = await client.post(url, headers=headers, json=payload, timeout=10.0)
                    
                if response.status_code == 200:
                    result = response.json()['choices'][0]['message']['content']
                    data = json.loads(result)
                    
                    predicted = max(0, data.get("predicted_total", 0))
                    low = max(0, data.get("confidence_low", predicted * 0.8))
                    high = max(0, data.get("confidence_high", predicted * 1.2))
                    
                    return {
                        "predicted_amount": Decimal(str(predicted)),
                        "confidence": "medium",
                        "range_low": Decimal(str(low)),
                        "range_high": Decimal(str(high)),
                        "method": "llm"
                    }
                    
        except Exception as e:
            logger.error(f"Buffer prediction error: {e}")
        
        return default_result

