import logging
import json
from decimal import Decimal
from typing import List, Optional
from fastapi import Depends

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
from app.features.forecasting.schemas import ForecastResponse, CategoryForecast
from app.core.llm import get_llm_service, LLMService
import calendar

class ForecastingService:
    def __init__(self, llm: LLMService = Depends(get_llm_service)):
        # Handle manual instantiation for LLM
        from app.core.llm import LLMService as ActualLLMService
        if isinstance(llm, ActualLLMService):
            self.llm = llm
        else:
            from app.core.llm import get_llm_service
            self.llm = get_llm_service()
        

    async def calculate_safe_to_spend(self, category_daily_history: List[dict], monthly_breakdown: List[dict] = []) -> ForecastResponse:
        """Forecast upcoming expenses for the next full month."""
        today = date.today()
        # Get first day of NEXT month
        if today.month == 12:
            next_month_start = date(today.year + 1, 1, 1)
        else:
            next_month_start = date(today.year, today.month + 1, 1)
            
        # Get last day of NEXT month
        _, last_day = calendar.monthrange(next_month_start.year, next_month_start.month)
        next_month_end = date(next_month_start.year, next_month_start.month, last_day)
        
        days_in_next_month = (next_month_end - next_month_start).days + 1
        time_frame_str = f"Next Month ({next_month_start.strftime('%B %Y')})"
        
        # LOGIC:
        # User requested category-wise Prophet forecast.
        
        use_prophet = settings.USE_AI_FORECASTING and PROPHET_AVAILABLE
        
        if use_prophet:
            return await self._calculate_prophet_categorywise(category_daily_history, monthly_breakdown, next_month_start, next_month_end, time_frame_str)
        
        # Fallback to LLM for basic total if Prophet is missing (though user wants Prophet)
        return await self._calculate_llm(category_daily_history, monthly_breakdown, time_frame_str, days_in_next_month)

    async def _calculate_prophet_categorywise(self, category_daily_history: List[dict], monthly_breakdown: List[dict], start_date: date, end_date: date, time_frame: str) -> ForecastResponse:
        """Forecast for each category individually using Prophet or Fixed Expense logic."""
        
        if not category_daily_history:
             return ForecastResponse(amount=Decimal("0.00"), reason="No historical data found.", time_frame=time_frame, confidence="low")

        try:
            df_all = pd.DataFrame(category_daily_history)
            if df_all.empty:
                return ForecastResponse(amount=Decimal("0.00"), reason="No historical data found.", time_frame=time_frame, confidence="low")
                
            categories = df_all['category'].unique()
            
            # Map monthly breakdown for easier recurring check
            # Filter out pseudo-categories starting with '_' to avoid mis-detecting trends
            cat_monthly_totals = {} 
            for month_data in monthly_breakdown:
                for cat, amount in month_data.get("categories", {}).items():
                    if cat.startswith("_"): continue
                    if cat not in cat_monthly_totals:
                        cat_monthly_totals[cat] = []
                    cat_monthly_totals[cat].append(amount)

            breakdown = []
            total_amount = Decimal("0.00")
            
            # Determine actual history days in the provided data
            min_history_date = pd.to_datetime(df_all['ds']).min()
            today = date.today()
            total_history_days = (today - min_history_date.date()).days + 1
            if total_history_days < 30: total_history_days = 120 # Fallback safety
            
            # Determine days to predict (from max historical date until end of next month)
            max_history_date = pd.to_datetime(df_all['ds']).max()
            days_to_predict = (end_date - max_history_date.date()).days
            
            if days_to_predict <= 0:
                 return ForecastResponse(amount=Decimal("0.00"), reason="Data already covers the forecast period.", time_frame=time_frame)

            for cat in categories:
                cat_df_raw = df_all[df_all['category'] == cat][['ds', 'y']].copy()
                cat_df_raw['ds'] = pd.to_datetime(cat_df_raw['ds'])
                
                # 1. FIXED/RECURRING DETECTION (Most accurate for Rent, SIPs, etc.)
                monthly_values = cat_monthly_totals.get(cat, [])
                num_months = len(monthly_values)
                num_txns = len(cat_df_raw)
                
                # Determine if it's a "Monthly Spiky" expense (Rent, Bills, SIPs)
                # Logic: 1-2 transactions per month average
                txns_per_month = num_txns / max(1, num_months)
                is_monthly_spiky = num_months >= 2 and txns_per_month <= 2.5
                
                # 2. PROPHET FOR ALL (Optimized per category type)
                if num_txns >= 3: # Even small data can benefit from Prophet with monthly seasonality
                    try:
                        # Fill in missing days with 0 for accurate volume modeling
                        all_dates = pd.date_range(start=min_history_date, end=max_history_date, freq='D')
                        cat_df = cat_df_raw.set_index('ds').reindex(all_dates, fill_value=0).reset_index()
                        cat_df.columns = ['ds', 'y']

                        # Adjust model parameters based on category behavior
                        if is_monthly_spiky:
                            # Rent/SIPs/Bills: Conservative trend, strong monthly cycle
                            m = Prophet(
                                daily_seasonality=False,
                                weekly_seasonality=False,
                                yearly_seasonality=False,
                                changepoint_prior_scale=0.005 # Very conservative trend shifts
                            )
                            # Add custom 30.5 day seasonality for monthly spikes (Rent/SIPs)
                            m.add_seasonality(name='monthly', period=30.5, fourier_order=5)
                        else:
                            # Discretionary (Food/Misc): Weekly patterns
                            m = Prophet(
                                daily_seasonality=False,
                                weekly_seasonality=True,
                                yearly_seasonality=False,
                                changepoint_prior_scale=0.05 # Allow some trend adaptation
                            )

                        m.fit(cat_df)
                        
                        future = m.make_future_dataframe(periods=days_to_predict)
                        forecast = m.predict(future)
                        
                        start_dt = pd.to_datetime(start_date)
                        end_dt = pd.to_datetime(end_date)
                        mask = (forecast['ds'] >= start_dt) & (forecast['ds'] <= end_dt)
                        predicted = forecast[mask]['yhat'].sum()
                        
                        # Safety Cap: Forecast should not realistically exceed 2x the historical monthly average
                        # For monthly spiky, hold closer to the observed median if history is short
                        hist_monthly_avg = (cat_df_raw['y'].sum() / total_history_days) * 30
                        if is_monthly_spiky:
                            import statistics
                            median_val = statistics.median(monthly_values) if monthly_values else hist_monthly_avg
                            # Apply a ceiling: Monthly recurring shouldn't suddenly spike more than 20% over max history
                            max_val = max(monthly_values) if monthly_values else hist_monthly_avg
                            predicted = max(predicted, median_val)
                            predicted = min(predicted, max_val * 1.2) 
                            
                            reason = f"Modeled as a monthly recurring expense ({cat})."
                        else:
                            predicted = min(predicted, hist_monthly_avg * 2)
                            reason = f"Trend-based forecast for discretionary spending ({cat})."
                        
                        cat_total = Decimal(str(max(0, round(predicted, 2))))
                    except Exception as e:
                        logger.error(f"Error forecasting category {cat}: {e}")
                        avg_daily = cat_df_raw['y'].sum() / total_history_days
                        cat_total = Decimal(str(max(0, round(avg_daily * 30, 2))))
                        reason = f"Fallback to average for {cat} due to model error."
                
                # 3. FALLBACK: SIMPLE MOVING AVERAGE
                else:
                    avg_daily = cat_df_raw['y'].sum() / total_history_days
                    cat_total = Decimal(str(max(0, round(avg_daily * 30, 2))))
                    reason = f"Historical average (insufficient data for AI modeling in {cat})."
                
                if cat_total > 50: # Filter out noise
                    logger.info(f"Forecast for {cat}: {cat_total} ({reason})")
                    breakdown.append(CategoryForecast(
                        category=cat,
                        predicted_amount=cat_total,
                        reason=reason
                    ))
                    total_amount += cat_total
            
            breakdown.sort(key=lambda x: x.predicted_amount, reverse=True)
            
            return ForecastResponse(
                amount=total_amount,
                reason=f"Multi-model forecast for {len(breakdown)} categories, optimized for monthly recurring expenses and discretionary trends.",
                time_frame=time_frame,
                confidence="high",
                breakdown=breakdown
            )

        except Exception as e:
            logger.error(f"Prophet category forecasting error: {e}")
            return ForecastResponse(
                amount=Decimal("0.00"),
                reason="System error during forecasting.",
                time_frame=time_frame,
                confidence="low"
            )

        except Exception as e:
            logger.error(f"Prophet category forecasting error: {e}")
            return ForecastResponse(
                amount=Decimal("0.00"),
                reason="System error during forecasting.",
                time_frame=time_frame,
                confidence="low"
            )

    async def _calculate_llm(self, category_daily_history: List[dict], monthly_breakdown: List[dict], time_frame: str, days: int) -> ForecastResponse:
        """Use LLM to predict remaining month expenses."""
        default_response = ForecastResponse(
            amount=Decimal("0.00"), 
            reason="Insufficient data/AI service unavailable.", 
            time_frame=time_frame,
            confidence="low"
        )

        if not self.llm.is_enabled:
            return default_response
            
        if not category_daily_history or len(category_daily_history) < 5:
            return ForecastResponse(
                amount=Decimal("0.00"),
                reason="Need more historical data to generate an AI forecast.",
                time_frame=time_frame,
                confidence="low"
            )

        try:
            # Prepare context for LLM from category daily history
            df = pd.DataFrame(category_daily_history)
            category_totals = df.groupby('category')['y'].sum().to_dict()
            recent_daily = df.groupby('ds')['y'].sum().tail(90).to_dict()
            
            prompt = f"""
            Analyze the following financial data to predict expenses for the NEXT {days} DAYS (full month).
            
            1. Daily History Summary: {json.dumps(recent_daily)}
            2. Category Totals (Last 120 days): {json.dumps(category_totals)}
            3. Monthly Category Trends (Key for recurring bills like Rent): {json.dumps(monthly_breakdown)}
            
            Task:
            - Analyze the 'Monthly Category Trends' to identify recurring payments (e.g., Rent, Insurance).
            - Note: Categories starting with '_' like '_Rent' are explicit recurring bills.
            - Predict discretionary spending based on 'Daily History'.
            
            Return the TOTAL predicted expenses for the full {days} day month.
            
            You must return a valid JSON object.
            Required JSON structure:
            {{
                "predicted_total": float,
                "reason": "short explanation",
                "breakdown": [
                    {{ "category": "string", "predicted_amount": float, "reason": "string" }}
                ]
            }}
            """

            system_prompt = "You are a financial intelligence engine. Always output valid JSON."
            data = await self.llm.generate_json(prompt, system_prompt=system_prompt, temperature=0.1, timeout=60.0)
                
            if data:
                return ForecastResponse(
                    amount=Decimal(str(max(0, data.get("predicted_total", 0)))),
                    reason=data.get("reason", "Based on analysis of spending cycles."),
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
            
            data = await self.llm.generate_json(prompt, temperature=0.1, timeout=60.0)
            if data:
                return data
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
            
            elif self.llm.is_enabled:
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
                
                data = await self.llm.generate_json(prompt, temperature=0.1, timeout=60.0)
                    
                if data:
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

