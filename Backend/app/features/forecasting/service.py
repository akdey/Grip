import logging
import json
import calendar
from decimal import Decimal
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
import pandas as pd
import numpy as np

try:
    import sklearn
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
    text_lower = str(text).lower()
    return 1 if any(kw in text_lower for kw in RECURRING_KEYWORDS) else 0


class LightGBMForecaster:
    """Hybrid Personal Finance Forecaster using Deterministic Recurring Detection + Regularized LightGBM/EWMA Ensemble."""

    @staticmethod
    def prepare_data(raw_transactions: List[dict]) -> pd.DataFrame:
        if not raw_transactions:
            return pd.DataFrame()

        df = pd.DataFrame(raw_transactions)
        
        date_col = 'transaction_date' if 'transaction_date' in df.columns else ('date' if 'date' in df.columns else 'ds')
        if date_col not in df.columns:
            return pd.DataFrame()

        df['date'] = pd.to_datetime(df[date_col])

        amt_col = 'amount' if 'amount' in df.columns else 'y'
        df['amount'] = df[amt_col].abs().astype(float)

        df['category'] = df['category'].fillna('Uncategorized').astype(str)
        
        sub_col = 'sub_category' if 'sub_category' in df.columns else ('subcategory' if 'subcategory' in df.columns else None)
        if sub_col and sub_col in df.columns:
            df['subcategory'] = df[sub_col].fillna('General').astype(str)
        else:
            df['subcategory'] = 'General'

        df['merchant_name'] = df['merchant_name'].fillna('') if 'merchant_name' in df.columns else ''
        df['remarks'] = df['remarks'].fillna('') if 'remarks' in df.columns else ''

        # Filter out 0 or near-zero amounts
        df = df[df['amount'] > 0.01].copy()

        df['year'] = df['date'].dt.year
        df['month'] = df['date'].dt.month

        return df

    @classmethod
    def train_and_forecast_next_month(
        cls, 
        raw_transactions: List[dict], 
        target_year: int, 
        target_month: int
    ) -> Tuple[Decimal, List[CategoryForecast], str]:
        df_raw = cls.prepare_data(raw_transactions)
        if df_raw.empty:
            return Decimal("0.00"), [], "No historical transaction data available."

        # Group by year, month, category, subcategory
        monthly_agg = (
            df_raw.groupby(['year', 'month', 'category', 'subcategory'], as_index=False)
            .agg({
                'amount': 'sum',
                'merchant_name': lambda s: ' '.join(set(s)),
                'remarks': lambda s: ' '.join(set(s))
            })
        )

        monthly_agg['period_dt'] = pd.to_datetime(
            monthly_agg['year'].astype(str) + '-' + monthly_agg['month'].astype(str).str.zfill(2) + '-01'
        )
        monthly_agg['period_str'] = monthly_agg['period_dt'].dt.strftime('%Y-%m')

        max_dt = monthly_agg['period_dt'].max()
        min_dt = monthly_agg['period_dt'].min()
        global_start_year = min_dt.year
        global_start_month = min_dt.month

        # Filter to active categories/subcategories in the last 12 months
        cutoff_dt = max_dt - pd.DateOffset(months=12)
        recent_agg = monthly_agg[monthly_agg['period_dt'] >= cutoff_dt]
        active_pairs = recent_agg[['category', 'subcategory']].drop_duplicates()

        if active_pairs.empty:
            active_pairs = monthly_agg[['category', 'subcategory']].drop_duplicates()

        all_periods = pd.date_range(start=min_dt, end=max_dt, freq='MS')

        # Feature dataset construction with lag-warmup protection
        feature_rows = []
        for pair in active_pairs.itertuples():
            cat = pair.category
            subcat = pair.subcategory

            sub_df = monthly_agg[(monthly_agg['category'] == cat) & (monthly_agg['subcategory'] == subcat)].sort_values('period_dt')
            if sub_df.empty:
                continue

            spend_by_period = sub_df.set_index('period_dt')['amount'].to_dict()

            rec_flag = int(
                is_recurring(cat) or is_recurring(subcat) or 
                any(is_recurring(m) for m in sub_df['merchant_name']) or 
                any(is_recurring(r) for r in sub_df['remarks'])
            )

            for p_dt in all_periods:
                # Require at least 3 months lag depth to prevent synthetic zero inflation
                if p_dt < min_dt + pd.DateOffset(months=3):
                    continue

                target_y = spend_by_period.get(p_dt, 0.0)

                p_1m = p_dt - pd.DateOffset(months=1)
                p_2m = p_dt - pd.DateOffset(months=2)
                p_3m = p_dt - pd.DateOffset(months=3)
                p_12m = p_dt - pd.DateOffset(years=1)

                v_1m = spend_by_period.get(p_1m, 0.0)
                v_2m = spend_by_period.get(p_2m, 0.0)
                v_3m = spend_by_period.get(p_3m, 0.0)
                v_12m = spend_by_period.get(p_12m, 0.0)

                hist_spends = [spend_by_period.get(p_dt - pd.DateOffset(months=m), 0.0) for m in range(1, 7)]
                non_zero_spends = [s for s in hist_spends if s > 0]
                
                mean_3m = float(np.mean(hist_spends[:3])) if hist_spends[:3] else 0.0
                std_3m = float(np.std(hist_spends[:3])) if hist_spends[:3] else 0.0
                mean_6m = float(np.mean(hist_spends)) if hist_spends else 0.0
                max_6m = float(np.max(hist_spends)) if hist_spends else 0.0
                median_recent = float(np.median(non_zero_spends)) if non_zero_spends else 0.0

                # Cyclical temporal features & relative time index
                sin_month = float(np.sin(2 * np.pi * p_dt.month / 12))
                cos_month = float(np.cos(2 * np.pi * p_dt.month / 12))
                months_from_start = (p_dt.year - global_start_year) * 12 + (p_dt.month - global_start_month)

                velocity_1m_3m = v_1m / (mean_3m + 1.0)
                volatility_ratio = std_3m / (mean_3m + 1.0)

                feature_rows.append({
                    'period_dt': p_dt,
                    'months_from_start': months_from_start,
                    'sin_month': sin_month,
                    'cos_month': cos_month,
                    'category': cat,
                    'subcategory': subcat,
                    'amount_last_1m': float(v_1m),
                    'amount_last_2m': float(v_2m),
                    'amount_last_3m': float(v_3m),
                    'mean_3m': mean_3m,
                    'std_3m': std_3m,
                    'mean_6m': mean_6m,
                    'max_6m': max_6m,
                    'median_recent': median_recent,
                    'amount_last_year': float(v_12m),
                    'velocity_1m_3m': float(velocity_1m_3m),
                    'volatility_ratio': float(volatility_ratio),
                    'active_months_count': len(non_zero_spends),
                    'is_recurring_keyword': rec_flag,
                    'amount': float(target_y)
                })

        feat_df = pd.DataFrame(feature_rows)
        if feat_df.empty:
            return cls._fallback_forecast(df_raw, target_year, target_month)

        feature_cols = [
            'months_from_start', 'sin_month', 'cos_month', 'category', 'subcategory', 
            'amount_last_1m', 'amount_last_2m', 'amount_last_3m', 
            'mean_3m', 'std_3m', 'mean_6m', 'max_6m', 'amount_last_year', 
            'velocity_1m_3m', 'volatility_ratio', 'active_months_count', 'is_recurring_keyword'
        ]

        feat_df['category'] = feat_df['category'].astype('category')
        feat_df['subcategory'] = feat_df['subcategory'].astype('category')

        target_dt = pd.to_datetime(f"{target_year}-{target_month:02d}-01")
        train_mask = feat_df['period_dt'] < target_dt
        train_df = feat_df[train_mask].copy()

        # Build inference dataset for target_dt
        infer_rows = []
        target_months_from_start = (target_year - global_start_year) * 12 + (target_month - global_start_month)
        target_sin = float(np.sin(2 * np.pi * target_month / 12))
        target_cos = float(np.cos(2 * np.pi * target_month / 12))

        # Track per-category EWMA, Deterministic Recurring projections, and active recency status
        ewma_dict: Dict[Tuple[str, str], float] = {}
        deterministic_dict: Dict[Tuple[str, str], Tuple[bool, float, str]] = {}
        is_active_category: Dict[Tuple[str, str], bool] = {}

        for pair in active_pairs.itertuples():
            cat = pair.category
            subcat = pair.subcategory

            sub_df = monthly_agg[(monthly_agg['category'] == cat) & (monthly_agg['subcategory'] == subcat)].sort_values('period_dt')
            spend_by_period = sub_df.set_index('period_dt')['amount'].to_dict()

            # Continuous monthly series including zeroes for inactive months
            full_series = pd.Series([spend_by_period.get(p, 0.0) for p in all_periods], index=all_periods)

            # Compute EWMA on continuous time series (zero-spend months properly decay the average)
            ewma_val = float(full_series.ewm(span=3, adjust=False).mean().iloc[-1]) if not full_series.empty else 0.0
            ewma_dict[(cat, subcat)] = ewma_val

            rec_flag = int(
                is_recurring(cat) or is_recurring(subcat) or 
                any(is_recurring(m) for m in sub_df['merchant_name']) or 
                any(is_recurring(r) for r in sub_df['remarks'])
            )

            p_1m = target_dt - pd.DateOffset(months=1)
            p_2m = target_dt - pd.DateOffset(months=2)
            p_3m = target_dt - pd.DateOffset(months=3)
            p_12m = target_dt - pd.DateOffset(years=1)

            v_1m = spend_by_period.get(p_1m, 0.0)
            v_2m = spend_by_period.get(p_2m, 0.0)
            v_3m = spend_by_period.get(p_3m, 0.0)
            v_12m = spend_by_period.get(p_12m, 0.0)

            recent_3m_total = v_1m + v_2m + v_3m

            # Recency Gate: Exclude dormant categories with $0 spend in the last 3 months
            if recent_3m_total == 0:
                is_active_category[(cat, subcat)] = False
            else:
                is_active_category[(cat, subcat)] = True

            non_zero_series = sub_df[sub_df['amount'] > 0]['amount']
            active_count = len(non_zero_series)

            # Check if this category qualifies for Deterministic Recurrence Engine
            if rec_flag == 1 and active_count >= 2 and is_active_category[(cat, subcat)]:
                recent_amounts = non_zero_series.tail(6).tolist()
                med_amt = float(np.median(recent_amounts))
                std_amt = float(np.std(recent_amounts))
                
                # Low volatility recurring cost (Rent, SIP, EMI, Subscription)
                if std_amt / (med_amt + 1e-5) < 0.35 or active_count >= 3:
                    fixed_amt = round(med_amt, 2)
                    deterministic_dict[(cat, subcat)] = (
                        True, 
                        fixed_amt, 
                        f"Fixed recurring cost based on monthly cycle (${fixed_amt:.2f})."
                    )
                else:
                    deterministic_dict[(cat, subcat)] = (False, 0.0, "")
            else:
                deterministic_dict[(cat, subcat)] = (False, 0.0, "")

            hist_spends = [v_1m, v_2m, v_3m, spend_by_period.get(target_dt - pd.DateOffset(months=4), 0.0), spend_by_period.get(target_dt - pd.DateOffset(months=5), 0.0), spend_by_period.get(target_dt - pd.DateOffset(months=6), 0.0)]
            non_zero_spends = [s for s in hist_spends if s > 0]

            mean_3m = float(np.mean(hist_spends[:3])) if hist_spends[:3] else 0.0
            std_3m = float(np.std(hist_spends[:3])) if hist_spends[:3] else 0.0
            mean_6m = float(np.mean(hist_spends)) if hist_spends else 0.0
            max_6m = float(np.max(hist_spends)) if hist_spends else 0.0
            median_recent = float(np.median(non_zero_spends)) if non_zero_spends else 0.0

            velocity_1m_3m = v_1m / (mean_3m + 1.0)
            volatility_ratio = std_3m / (mean_3m + 1.0)

            infer_rows.append({
                'months_from_start': target_months_from_start,
                'sin_month': target_sin,
                'cos_month': target_cos,
                'category': cat,
                'subcategory': subcat,
                'amount_last_1m': float(v_1m),
                'amount_last_2m': float(v_2m),
                'amount_last_3m': float(v_3m),
                'mean_3m': mean_3m,
                'std_3m': std_3m,
                'mean_6m': mean_6m,
                'max_6m': max_6m,
                'median_recent': median_recent,
                'amount_last_year': float(v_12m),
                'velocity_1m_3m': float(velocity_1m_3m),
                'volatility_ratio': float(volatility_ratio),
                'active_months_count': len(non_zero_spends),
                'is_recurring_keyword': rec_flag
            })

        X_infer = pd.DataFrame(infer_rows)
        X_infer['category'] = X_infer['category'].astype('category')
        X_infer['subcategory'] = X_infer['subcategory'].astype('category')

        # Fit regularized LightGBM on small dataset
        lgb_preds_map: Dict[Tuple[str, str], float] = {}

        if LIGHTGBM_AVAILABLE and not train_df.empty and len(train_df['period_dt'].unique()) >= 2:
            try:
                X_train = train_df[feature_cols]
                y_train = train_df['amount']

                model = LGBMRegressor(
                    n_estimators=40,          # Reduced trees to prevent overfitting small sample size
                    learning_rate=0.05,
                    max_depth=3,              # Shallow tree depth for small datasets
                    num_leaves=7,             # Max 7 leaves per tree
                    min_child_samples=3,      # At least 3 samples required per leaf
                    reg_alpha=0.1,            # L1 regularization
                    reg_lambda=1.0,           # L2 regularization
                    subsample=0.8,
                    random_state=42,
                    verbosity=-1
                )
                model.fit(X_train, y_train, categorical_feature=['category', 'subcategory'])
                preds = model.predict(X_infer[feature_cols])
                preds = np.maximum(0, preds)

                for idx, row in X_infer.iterrows():
                    key = (str(row['category']), str(row['subcategory']))
                    lgb_preds_map[key] = float(preds[idx])
            except Exception as e:
                logger.error(f"LightGBM fitting error: {e}", exc_info=True)

        breakdown: List[CategoryForecast] = []
        total_amount = Decimal("0.00")

        for _, row in X_infer.iterrows():
            cat_name = str(row['category'])
            sub_name = str(row['subcategory'])
            key = (cat_name, sub_name)

            # Skip inactive / dormant categories (e.g. Home Build or old one-offs with $0 in last 3m)
            if not is_active_category.get(key, True):
                continue

            is_det, det_val, det_reason = deterministic_dict.get(key, (False, 0.0, ""))
            med_recent = float(row['median_recent'])
            max_6m = float(row['max_6m'])
            mean_3m = float(row['mean_3m'])
            v_1m = float(row['amount_last_1m'])
            ewma_val = ewma_dict.get(key, mean_3m)
            active_cnt = int(row['active_months_count'])

            if is_det:
                pred_val = det_val
                reason_msg = det_reason
            else:
                lgb_val = lgb_preds_map.get(key, ewma_val)
                
                # Ensemble Blend: 50% regularized LightGBM + 50% EWMA if active, else EWMA
                if active_cnt >= 4 and key in lgb_preds_map:
                    raw_pred = 0.5 * lgb_val + 0.5 * ewma_val
                    reason_msg = f"Hybrid ML ensemble forecast based on rolling trends (${mean_3m:.2f})."
                else:
                    raw_pred = ewma_val
                    reason_msg = f"Exponential moving average forecast based on recent trend (${ewma_val:.2f})."

                # Tight Clamping bounds for discretionary costs so predictions don't explode:
                if mean_3m > 0:
                    clamped_pred = min(raw_pred, 1.25 * max(mean_3m, v_1m))
                elif v_1m > 0:
                    clamped_pred = min(raw_pred, 1.25 * v_1m)
                else:
                    clamped_pred = raw_pred

                pred_val = round(clamped_pred, 2)

            if pred_val > 1.0:
                amt_dec = Decimal(str(pred_val))
                breakdown.append(CategoryForecast(
                    category=cat_name,
                    sub_category=sub_name if sub_name != 'General' else None,
                    predicted_amount=amt_dec,
                    reason=reason_msg
                ))
                total_amount += amt_dec

        breakdown.sort(key=lambda x: x.predicted_amount, reverse=True)
        return total_amount, breakdown, "Hybrid Deterministic + Small-Sample Regularized ML Ensemble Engine"

    @classmethod
    def _fallback_forecast(
        cls, 
        df_raw: pd.DataFrame, 
        target_year: int, 
        target_month: int
    ) -> Tuple[Decimal, List[CategoryForecast], str]:
        """Fallback forecast using recent 3-month moving average per category/subcategory."""
        if df_raw.empty:
            return Decimal("0.00"), [], "No transaction data."

        df_raw['year'] = df_raw['date'].dt.year
        df_raw['month'] = df_raw['date'].dt.month
        df_raw['period_dt'] = pd.to_datetime(
            df_raw['year'].astype(str) + '-' + df_raw['month'].astype(str).str.zfill(2) + '-01'
        )

        max_dt = df_raw['period_dt'].max()
        cutoff_dt = max_dt - pd.DateOffset(months=3)
        recent_df = df_raw[df_raw['period_dt'] >= cutoff_dt]

        if recent_df.empty:
            recent_df = df_raw

        monthly_spends = recent_df.groupby(['category', 'subcategory', 'period_dt'])['amount'].sum().reset_index()
        avg_spends = monthly_spends.groupby(['category', 'subcategory'])['amount'].mean().reset_index()

        breakdown = []
        total_amount = Decimal("0.00")

        for _, row in avg_spends.iterrows():
            amt = Decimal(str(round(float(row['amount']), 2)))
            if amt > 1.0:
                cat_name = str(row['category'])
                sub_name = str(row['subcategory'])
                breakdown.append(CategoryForecast(
                    category=cat_name,
                    sub_category=sub_name if sub_name != 'General' else None,
                    predicted_amount=amt,
                    reason="Recent 3-month moving average baseline."
                ))
                total_amount += amt

        breakdown.sort(key=lambda x: x.predicted_amount, reverse=True)
        return total_amount, breakdown, "Recent moving average baseline forecast"


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
