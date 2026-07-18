import logging
import json
import calendar
from decimal import Decimal
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
import pandas as pd
import numpy as np

try:
    from lightgbm import LGBMRegressor
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False
    LGBMRegressor = None

from fastapi import Depends
from app.core.config import get_settings
from app.features.forecasting.schemas import ForecastResponse, CategoryForecast
from app.core.llm import get_llm_service, LLMService

logger = logging.getLogger(__name__)
settings = get_settings()

RECURRING_KEYWORDS = {
    'rent', 'emi', 'subscription', 'sip', 'maintenance', 
    'insurance', 'bill', 'utility', 'electricity', 'recurring', 
    'recharge', 'broadband', 'wifi', 'mortgage', 'loan'
}

def is_recurring(text: str) -> int:
    if not text:
        return 0
    text_lower = text.lower()
    return 1 if any(kw in text_lower for kw in RECURRING_KEYWORDS) else 0


class LightGBMForecaster:
    """Tabular ML Forecaster using LightGBM for Category and Subcategory expenditure."""

    @staticmethod
    def prepare_data(raw_transactions: List[dict]) -> pd.DataFrame:
        if not raw_transactions:
            return pd.DataFrame()

        df = pd.DataFrame(raw_transactions)
        
        # Standardize date column
        date_col = 'transaction_date' if 'transaction_date' in df.columns else ('date' if 'date' in df.columns else 'ds')
        if date_col not in df.columns:
            return pd.DataFrame()

        df['date'] = pd.to_datetime(df[date_col])

        # Standardize amount column
        amt_col = 'amount' if 'amount' in df.columns else 'y'
        df['amount'] = df[amt_col].abs().astype(float)

        # Standardize category & subcategory
        df['category'] = df['category'].fillna('Uncategorized').astype(str)
        
        sub_col = 'sub_category' if 'sub_category' in df.columns else ('subcategory' if 'subcategory' in df.columns else None)
        if sub_col and sub_col in df.columns:
            df['subcategory'] = df[sub_col].fillna('General').astype(str)
        else:
            df['subcategory'] = 'General'

        df['merchant_name'] = df['merchant_name'].fillna('') if 'merchant_name' in df.columns else ''
        df['remarks'] = df['remarks'].fillna('') if 'remarks' in df.columns else ''

        # Extract discrete numerical columns
        df['year'] = df['date'].dt.year
        df['month'] = df['date'].dt.month

        return df

    @classmethod
    def build_monthly_feature_matrix(cls, df_raw: pd.DataFrame) -> pd.DataFrame:
        if df_raw.empty:
            return pd.DataFrame()

        # Group by year, month, category, subcategory and calculate sum of amount
        agg = (
            df_raw.groupby(['year', 'month', 'category', 'subcategory'], as_index=False)
            .agg({
                'amount': 'sum',
                'merchant_name': lambda s: ' '.join(set(s)),
                'remarks': lambda s: ' '.join(set(s))
            })
        )

        # Calculate is_recurring_keyword feature
        agg['is_recurring_keyword'] = agg.apply(
            lambda r: int(
                is_recurring(r['category']) or 
                is_recurring(r['subcategory']) or 
                is_recurring(r['merchant_name']) or 
                is_recurring(r['remarks'])
            ),
            axis=1
        )

        # Create continuous monthly grid per (category, subcategory) pair for exact lag shifting
        all_pairs = agg[['category', 'subcategory']].drop_duplicates()
        
        min_date = pd.to_datetime(f"{agg['year'].min()}-{agg['month'].min():02d}-01")
        max_date = pd.to_datetime(f"{agg['year'].max()}-{agg['month'].max():02d}-01")
        
        all_months = pd.date_range(start=min_date, end=max_date, freq='MS')
        
        grid_rows = []
        for dt in all_months:
            for _, pair in all_pairs.iterrows():
                grid_rows.append({
                    'year': dt.year,
                    'month': dt.month,
                    'category': pair['category'],
                    'subcategory': pair['subcategory'],
                    'period': dt
                })
        
        grid = pd.DataFrame(grid_rows)
        grid['period_str'] = grid['period'].dt.strftime('%Y-%m')
        
        agg['period_dt'] = pd.to_datetime(agg['year'].astype(str) + '-' + agg['month'].astype(str).str.zfill(2) + '-01')
        agg['period_str'] = agg['period_dt'].dt.strftime('%Y-%m')

        merged = pd.merge(
            grid,
            agg[['period_str', 'category', 'subcategory', 'amount', 'is_recurring_keyword']],
            on=['period_str', 'category', 'subcategory'],
            how='left'
        )

        merged['amount'] = merged['amount'].fillna(0.0)
        
        merged['is_recurring_keyword'] = merged.apply(
            lambda r: r['is_recurring_keyword'] if pd.notna(r['is_recurring_keyword']) 
            else int(is_recurring(str(r['category'])) or is_recurring(str(r['subcategory']))),
            axis=1
        )

        # Sort chronologically within group for lag generation
        merged = merged.sort_values(by=['category', 'subcategory', 'period']).reset_index(drop=True)

        # Lag features: amount_last_month (shift 1) and amount_last_year (shift 12)
        merged['amount_last_month'] = merged.groupby(['category', 'subcategory'])['amount'].shift(1).fillna(0.0)
        merged['amount_last_year'] = merged.groupby(['category', 'subcategory'])['amount'].shift(12).fillna(0.0)

        return merged

    @classmethod
    def train_and_forecast_next_month(
        cls, 
        raw_transactions: List[dict], 
        target_year: int, 
        target_month: int
    ) -> Tuple[Decimal, List[CategoryForecast], str]:
        """Train LightGBM model and forecast next month expenditures."""
        df_raw = cls.prepare_data(raw_transactions)
        if df_raw.empty:
            return Decimal("0.00"), [], "No historical transaction data available."

        matrix = cls.build_monthly_feature_matrix(df_raw)
        if matrix.empty or len(matrix['period_str'].unique()) < 2:
            return cls._fallback_forecast(df_raw, target_year, target_month)

        feature_cols = ['year', 'month', 'category', 'subcategory', 'amount_last_month', 'amount_last_year', 'is_recurring_keyword']
        
        # Convert categorical columns
        matrix['category'] = matrix['category'].astype('category')
        matrix['subcategory'] = matrix['subcategory'].astype('category')

        # Filter training data
        train_df = matrix.dropna(subset=['amount']).copy()
        
        X_train = train_df[feature_cols]
        y_train = train_df['amount']

        if not LIGHTGBM_AVAILABLE:
            logger.warning("LightGBM not installed. Using fallback moving average forecaster.")
            return cls._fallback_forecast(df_raw, target_year, target_month)

        try:
            model = LGBMRegressor(
                n_estimators=100,
                learning_rate=0.05,
                max_depth=5,
                num_leaves=15,
                min_child_samples=2,
                random_state=42,
                verbosity=-1
            )
            
            model.fit(
                X_train, 
                y_train, 
                categorical_feature=['category', 'subcategory']
            )

            # Build inference rows for target_year, target_month
            pairs = matrix[['category', 'subcategory']].drop_duplicates()

            infer_rows = []
            target_dt = pd.to_datetime(f"{target_year}-{target_month:02d}-01")
            year_ago_dt = target_dt - pd.DateOffset(years=1)
            year_ago_str = year_ago_dt.strftime('%Y-%m')

            for _, pair in pairs.iterrows():
                cat = pair['category']
                subcat = pair['subcategory']

                sub_df = matrix[(matrix['category'] == cat) & (matrix['subcategory'] == subcat)].sort_values('period')
                last_m_val = sub_df['amount'].iloc[-1] if not sub_df.empty else 0.0

                yago_df = sub_df[sub_df['period_str'] == year_ago_str]
                last_y_val = yago_df['amount'].iloc[0] if not yago_df.empty else 0.0

                rec_val = int(is_recurring(str(cat)) or is_recurring(str(subcat)))

                infer_rows.append({
                    'year': target_year,
                    'month': target_month,
                    'category': cat,
                    'subcategory': subcat,
                    'amount_last_month': float(last_m_val),
                    'amount_last_year': float(last_y_val),
                    'is_recurring_keyword': rec_val
                })

            X_infer = pd.DataFrame(infer_rows)
            X_infer['category'] = X_infer['category'].astype('category')
            X_infer['subcategory'] = X_infer['subcategory'].astype('category')

            preds = model.predict(X_infer[feature_cols])
            preds = np.maximum(0, preds)

            X_infer['predicted_amount'] = preds

            breakdown: List[CategoryForecast] = []
            total_amount = Decimal("0.00")

            for _, row in X_infer.iterrows():
                pred_val = round(float(row['predicted_amount']), 2)
                if pred_val > 1.0:
                    amt_dec = Decimal(str(pred_val))
                    cat_name = str(row['category'])
                    sub_name = str(row['subcategory'])
                    
                    reason_msg = f"LightGBM prediction based on last month ({row['amount_last_month']:.2f}) and seasonal lag ({row['amount_last_year']:.2f})."
                    if row['is_recurring_keyword'] == 1:
                        reason_msg += " Recurring pattern recognized."

                    breakdown.append(CategoryForecast(
                        category=cat_name,
                        sub_category=sub_name if sub_name != 'General' else None,
                        predicted_amount=amt_dec,
                        reason=reason_msg
                    ))
                    total_amount += amt_dec

            breakdown.sort(key=lambda x: x.predicted_amount, reverse=True)
            return total_amount, breakdown, "Tabular LightGBM model with lag & seasonal features"

        except Exception as e:
            logger.error(f"Error in LightGBM forecasting: {e}", exc_info=True)
            return cls._fallback_forecast(df_raw, target_year, target_month)

    @classmethod
    def _fallback_forecast(
        cls, 
        df_raw: pd.DataFrame, 
        target_year: int, 
        target_month: int
    ) -> Tuple[Decimal, List[CategoryForecast], str]:
        """Fallback moving average forecast when ML training is unavailable."""
        if df_raw.empty:
            return Decimal("0.00"), [], "No transaction data."

        grouped = df_raw.groupby(['category', 'subcategory'])['amount'].mean().reset_index()
        breakdown = []
        total_amount = Decimal("0.00")

        for _, row in grouped.iterrows():
            amt = Decimal(str(round(float(row['amount']), 2)))
            if amt > 1.0:
                cat_name = str(row['category'])
                sub_name = str(row['subcategory'])
                breakdown.append(CategoryForecast(
                    category=cat_name,
                    sub_category=sub_name if sub_name != 'General' else None,
                    predicted_amount=amt,
                    reason="Historical average spend baseline."
                ))
                total_amount += amt

        breakdown.sort(key=lambda x: x.predicted_amount, reverse=True)
        return total_amount, breakdown, "Simple moving average baseline forecast"


class ForecastingService:
    def __init__(self, llm: LLMService = Depends(get_llm_service)):
        from app.core.llm import LLMService as ActualLLMService
        if isinstance(llm, ActualLLMService):
            self.llm = llm
        else:
            from app.core.llm import get_llm_service
            self.llm = get_llm_service()

    async def calculate_safe_to_spend(
        self, 
        raw_transactions: List[dict] = [], 
        monthly_breakdown: List[dict] = []
    ) -> ForecastResponse:
        """Forecast upcoming expenses for the next full month using LightGBM Tabular ML."""
        today = date.today()
        if today.month == 12:
            next_month_start = date(today.year + 1, 1, 1)
        else:
            next_month_start = date(today.year, today.month + 1, 1)

        _, last_day = calendar.monthrange(next_month_start.year, next_month_start.month)
        next_month_end = date(next_month_start.year, next_month_start.month, last_day)

        time_frame_str = f"Next Month ({next_month_start.strftime('%B %Y')})"

        if raw_transactions:
            total_amount, breakdown, method_reason = LightGBMForecaster.train_and_forecast_next_month(
                raw_transactions, 
                next_month_start.year, 
                next_month_start.month
            )

            return ForecastResponse(
                amount=total_amount,
                reason=f"Tabular ML forecast ({method_reason}) for {len(breakdown)} categories/subcategories.",
                time_frame=time_frame_str,
                confidence="high" if LIGHTGBM_AVAILABLE else "medium",
                breakdown=breakdown
            )

        days_in_next_month = (next_month_end - next_month_start).days + 1
        return await self._calculate_llm(raw_transactions, monthly_breakdown, time_frame_str, days_in_next_month)

    async def _calculate_llm(self, category_daily_history: List[dict], monthly_breakdown: List[dict], time_frame: str, days: int) -> ForecastResponse:
        """Use LLM to predict remaining month expenses if data is sparse or service calls LLM fallback."""
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
            df = pd.DataFrame(category_daily_history)
            category_totals = df.groupby('category')['y'].sum().to_dict() if 'y' in df.columns else {}
            recent_daily = df.groupby('ds')['y'].sum().tail(90).to_dict() if 'ds' in df.columns and 'y' in df.columns else {}
            
            prompt = f"""
            Analyze the following financial data to predict expenses for the NEXT {days} DAYS (full month).
            
            1. Daily History Summary: {json.dumps(recent_daily)}
            2. Category Totals (Last 120 days): {json.dumps(category_totals)}
            3. Monthly Category Trends: {json.dumps(monthly_breakdown)}
            
            Return the TOTAL predicted expenses for the full {days} day month.
            
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

    async def predict_discretionary_buffer(self, history_data: List[dict], buffer_days: int = 7) -> dict:
        """Predict discretionary spending for the next N days."""
        default_result = {
            "predicted_amount": Decimal("500"),
            "confidence": "low",
            "range_low": Decimal("500"),
            "range_high": Decimal("500"),
            "method": "fallback"
        }
        
        if not history_data or len(history_data) < 7:
            return default_result
        
        try:
            df = pd.DataFrame(history_data)
            val_col = 'y' if 'y' in df.columns else ('amount' if 'amount' in df.columns else None)
            if val_col:
                daily_avg = df[val_col].abs().mean()
                predicted_total = daily_avg * buffer_days
                range_low = max(0.0, predicted_total * 0.8)
                range_high = predicted_total * 1.2

                return {
                    "predicted_amount": Decimal(str(round(predicted_total, 2))),
                    "confidence": "medium",
                    "range_low": Decimal(str(round(range_low, 2))),
                    "range_high": Decimal(str(round(range_high, 2))),
                    "method": "moving_average"
                }
        except Exception as e:
            logger.error(f"Buffer prediction error: {e}")
        
        return default_result
