import logging
import pandas as pd
from decimal import Decimal
from typing import List

# Lazy import Prophet to avoid crashes if not installed/compiled
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    
logger = logging.getLogger(__name__)

class ForecastingService:
    def __init__(self):
        self.lookahead_days = 30
        
    def calculate_safe_to_spend(self, history_data: List[dict]) -> Decimal:
        """Forecast upcoming expenses for the next 30 days."""
        if not PROPHET_AVAILABLE:
            return Decimal("0.00")

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
            logger.error(f"Forecasting error: {e}")
            return Decimal("0.00")
