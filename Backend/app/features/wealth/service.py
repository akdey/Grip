
import uuid
import logging
from typing import List, Optional, Tuple
from datetime import date, datetime, timedelta
import math
import httpx
import pandas as pd
import numpy as np
from scipy import optimize
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_
from fastapi import HTTPException, Depends

from app.core.database import get_db
from app.features.wealth.models import InvestmentHolding, InvestmentSnapshot, InvestmentMappingRule, AssetType
from app.features.wealth import schemas
from app.features.transactions.models import Transaction

logger = logging.getLogger(__name__)

# Try importing Prophet, handle if missing (though it should be there)
try:
    from prophet import Prophet
except ImportError:
    Prophet = None
    logger.warning("Facebook Prophet not installed. Forecasting will be disabled.")

try:
    import yfinance as yf
except ImportError:
    yf = None
    logger.warning("yfinance not installed. Stock data will be unavailable.")

class WealthService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db

    async def get_holdings(self, user_id: uuid.UUID) -> List[InvestmentHolding]:
        stmt = select(InvestmentHolding).where(InvestmentHolding.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_holding_details(self, holding_id: uuid.UUID, user_id: uuid.UUID) -> InvestmentHolding:
        # Use selectinload to fetch snapshots efficiently
        from sqlalchemy.orm import selectinload
        stmt = (
            select(InvestmentHolding)
            .where(InvestmentHolding.id == holding_id, InvestmentHolding.user_id == user_id)
            .options(selectinload(InvestmentHolding.snapshots))
        )
        result = await self.db.execute(stmt)
        holding = result.scalar_one_or_none()
        
        if not holding:
            raise ValueError("Holding not found")
            
        return holding

    async def create_holding(self, user_id: uuid.UUID, data: schemas.InvestmentHoldingCreate) -> InvestmentHolding:
        """Create a new holding. If existing holdings data provided, create synthetic snapshots."""
        from dateutil.relativedelta import relativedelta
        
        # Extract onboarding fields
        current_units = data.current_units
        total_invested = data.total_invested
        start_date = data.investment_start_date
        investment_type = data.investment_type
        
        # Create holding (exclude onboarding fields from model)
        holding_data = data.model_dump(exclude={'current_units', 'total_invested', 'investment_start_date', 'investment_type'})
        holding = InvestmentHolding(**holding_data, user_id=user_id)
        
        # Set initial values if provided
        if total_invested:
            holding.total_invested = total_invested
        if current_units and holding.api_source in ['MFAPI', 'YFINANCE']:
            # Fetch current NAV to calculate current value
            try:
                current_nav = await self.get_asset_price(holding, date.today())
                holding.current_value = current_units * current_nav
            except:
                holding.current_value = total_invested if total_invested else 0
        
        self.db.add(holding)
        await self.db.commit()
        await self.db.refresh(holding)
        
        # If user provided existing holdings data, create synthetic snapshots
        if current_units and total_invested and start_date:
            await self._create_synthetic_snapshots(
                holding=holding,
                current_units=current_units,
                total_invested=total_invested,
                start_date=start_date,
                investment_type=investment_type or 'SIP'
            )
            
            # Calculate XIRR from synthetic data
            try:
                holding.xirr = await self.calculate_xirr(holding.id)
            except:
                logger.warning(f"Could not calculate XIRR for holding {holding.id}")
            
            await self.db.commit()
            await self.db.refresh(holding)
        
        return holding
    
    async def _create_synthetic_snapshots(
        self,
        holding: InvestmentHolding,
        current_units: float,
        total_invested: float,
        start_date: date,
        investment_type: str
    ):
        """Create synthetic snapshots for onboarding with existing holdings."""
        from dateutil.relativedelta import relativedelta
        
        today = date.today()
        
        # Get current NAV
        try:
            current_nav = await self.get_asset_price(holding, today)
        except:
            current_nav = total_invested / current_units if current_units > 0 else 1.0
        
        # Estimate start NAV (reverse calculate from current value)
        # Assuming linear growth for simplicity
        start_nav = total_invested / current_units if current_units > 0 else current_nav
        
        if investment_type == 'LUMPSUM':
            # Create 2 snapshots: start and today
            snapshots = [
                InvestmentSnapshot(
                    holding_id=holding.id,
                    user_id=holding.user_id,
                    captured_at=start_date,
                    units_held=current_units,
                    price_per_unit=start_nav,
                    total_value=total_invested,
                    amount_invested_delta=total_invested,
                    is_projected=True
                ),
                InvestmentSnapshot(
                    holding_id=holding.id,
                    user_id=holding.user_id,
                    captured_at=today,
                    units_held=current_units,
                    price_per_unit=current_nav,
                    total_value=current_units * current_nav,
                    amount_invested_delta=0,
                    is_projected=False  # Today's data is real
                )
            ]
        
        elif investment_type == 'SIP':
            # Calculate months between start and today
            months_diff = (today.year - start_date.year) * 12 + (today.month - start_date.month)
            
            if months_diff <= 0:
                months_diff = 1
            
            # Calculate average SIP amount
            sip_amount = total_invested / months_diff
            
            # Create monthly snapshots
            snapshots = []
            running_units = 0.0
            running_invested = 0.0
            
            for i in range(months_diff + 1):
                snap_date = start_date + relativedelta(months=i)
                if snap_date > today:
                    break
                
                # Estimate units accumulated so far
                invested_so_far = sip_amount * (i + 1)
                units_so_far = (current_units / total_invested) * invested_so_far
                
                # Linear NAV interpolation
                nav_progress = i / months_diff if months_diff > 0 else 1
                estimated_nav = start_nav + (current_nav - start_nav) * nav_progress
                
                running_units = units_so_far
                running_invested = invested_so_far
                
                is_today = snap_date == today
                
                snapshots.append(InvestmentSnapshot(
                    holding_id=holding.id,
                    user_id=holding.user_id,
                    captured_at=snap_date,
                    units_held=running_units,
                    price_per_unit=estimated_nav,
                    total_value=running_units * estimated_nav,
                    amount_invested_delta=sip_amount,
                    is_projected=not is_today  # Only today's is real
                ))
        
        else:
            # Unknown type, create simple lumpsum
            snapshots = [
                InvestmentSnapshot(
                    holding_id=holding.id,
                    user_id=holding.user_id,
                    captured_at=today,
                    units_held=current_units,
                    price_per_unit=current_nav,
                    total_value=current_units * current_nav,
                    amount_invested_delta=total_invested,
                    is_projected=True
                )
            ]
        
        self.db.add_all(snapshots)
        await self.db.commit()
        
        logger.info(f"Created {len(snapshots)} synthetic snapshots for holding {holding.id}")

    # --- Pricing & Sync Logic ---

    async def fetch_nav_mfapi(self, scheme_code: str, target_date: Optional[date] = None) -> float:
        """Fetch NAV from MFAPI.in. If date provided, find closest NAV. Else latest."""
        url = f"https://api.mfapi.in/mf/{scheme_code}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise ValueError(f"Invalid MFAPI code: {scheme_code}")
            data = resp.json().get("data", [])
            
        if not data:
            raise ValueError("No data found for scheme")

        # Data is list of {date: "dd-mm-yyyy", nav: "str"} sorted desc
        
        if not target_date:
            return float(data[0]["nav"])
        
        # Find match for date
        target_str = target_date.strftime("%d-%m-%Y")
        
        # Linear search (list is usually sorted desc)
        for entry in data:
            if entry["date"] == target_str:
                return float(entry["nav"])
            
            # If we passed the date (data is strictly descending), we might need to take prev or next
            # Simplified: Exact match or throw/fallback to closest
            # Since MF NAVs are daily, let's try to match.
            
        # If strict match failed, let's try parsing and finding closest
        # This is expensive? Maybe just error for ecosystem simplicity first.
        # Fallback: Use latest if today, else error.
        raise ValueError(f"No NAV found for date {target_str}")

    async def fetch_price_yfinance(self, ticker: str, target_date: Optional[date] = None) -> float:
        if not yf:
            raise ValueError("yfinance library missing")
        
        # yfinance logic
        ticker_obj = yf.Ticker(ticker)
        if target_date:
            # fetch history around date
            start = target_date
            end = target_date + timedelta(days=1)
            hist = ticker_obj.history(start=start, end=end)
            if not hist.empty:
                return float(hist["Close"].iloc[0])
            else:
                 # Try slightly wider window for weekends/holidays
                 end = target_date + timedelta(days=4)
                 hist = ticker_obj.history(start=start, end=end)
                 if not hist.empty:
                     return float(hist["Close"].iloc[0])
                 raise ValueError("No stock price data for date")
        else:
             # Latest
             hist = ticker_obj.history(period="1d")
             if not hist.empty:
                 return float(hist["Close"].iloc[-1])
             raise ValueError("No current stock price data")

    async def get_asset_price(self, holding: InvestmentHolding, target_date: Optional[date] = None) -> float:
        if holding.asset_type in [AssetType.FD, AssetType.RD, AssetType.PF, AssetType.GRATUITY]:
            # Fixed income / Computed logic
            # For now return 1.0 or user manually handled. 
            # Actually, PF/Gratuity have specific formulas, but "price per unit" concept applies vaguely
            # if we treat Unit=1 and Value = computed.
            return 1.0 

        if not holding.ticker_symbol:
             return 1.0 # Fallback for manual assets

        if holding.api_source == "MFAPI":
            return await self.fetch_nav_mfapi(holding.ticker_symbol, target_date)
        elif holding.api_source == "YFINANCE":
            return await self.fetch_price_yfinance(holding.ticker_symbol, target_date)
            
        return 1.0

    # --- Transaction Mapping & Logic ---

    async def process_transaction_match(self, transaction: Transaction) -> bool:
        """
        Called by SyncService/TransactionService.
        Attempts to map a transaction to a holding and update it.
        Returns True if mapped and processed.
        """
        if transaction.amount > 0:
             # Income? Or Refund? Typically wealth investment is outgoing (negative amount in transaction usually denotes speinding)
             # But if "Investment" category, a DEBIT (negative) is a BUY. A CREDIT (positive) is a SELL.
             # Grip stores expenses as negative? Or positive?
             # Standard Grip: Amount is positive for expense if type is DEBIT?
             # Let's check SyncService: final_amount = -abs(amount) for Debit.
             # So Expense is negative.
             pass

        # Find matching rules
        # We need to match pattern against merchant_name or remarks or even raw extraction context if possible.
        # Here we only have transaction details.
        
        stmt = select(InvestmentMappingRule).where(InvestmentMappingRule.user_id == transaction.user_id)
        result = await self.db.execute(stmt)
        rules = result.scalars().all()
        
        matched_rule = None
        search_text = f"{transaction.merchant_name} {transaction.remarks or ''}".lower()
        
        for rule in rules:
            if rule.match_type == "CONTAINS" and rule.pattern.lower() in search_text:
                matched_rule = rule
                break
            elif rule.match_type == "EXACT" and rule.pattern.lower() == search_text:
                matched_rule = rule
                break
                
        if not matched_rule:
            return False
            
        # Match found! Execute Logic.
        holding_id = matched_rule.holding_id
        await self.add_transaction_to_holding(transaction, holding_id)
        return True

    async def add_transaction_to_holding(self, transaction: Transaction, holding_id: uuid.UUID):
        """
        Calculates units and updates snapshot.
        Transaction Amount < 0 => BUY (usually).
        Transaction Amount > 0 => SELL.
        Wait, standard logic: Debit (negative) -> Money leaves account -> Enters Investment -> Buy.
        Credit (positive) -> Money enters account -> Leaves Investment -> Sell.
        """
        holding = await self.db.get(InvestmentHolding, holding_id)
        if not holding:
            return

        amount = transaction.amount
        txn_date = transaction.transaction_date or date.today()
        
        # Calculate Amount Invested Delta
        # If Amount = -1000 (Debit), we invested 1000. Delta = +1000.
        # If Amount = +1000 (Credit), we sold 1000. Delta = -1000? 
        # Actually XIRR expects: Dates, Cashflow.
        # Buy: -1000 cashflow for user. 
        # But here 'amount_invested_delta' tracks what went INTO the asset.
        invested_delta = float(-amount)
        
        # Get Price
        try:
            price = await self.get_asset_price(holding, txn_date)
        except Exception as e:
            logger.error(f"Failed to fetch price for {holding.name}: {e}")
            price = 1.0 # Fallback? Or fail?
            
        units = 0.0
        if price > 0:
            units = invested_delta / price
            
        # Create Snapshot for this specific transaction action
        # Note: We might already have a snapshot for this day? 
        # If so, update it? Or just insert new one?
        # Prophet works better with daily aggregates. 
        # But we also want to track the explicit "Buy" action.
        # Let's see models: "captured_at" is Date. Unique index? 
        # "Index heavily on (user_id, captured_at)" was requested.
        # We should merge with existing snapshot if exists for that day.
        
        stmt = select(InvestmentSnapshot).where(
            and_(
                InvestmentSnapshot.holding_id == holding_id,
                InvestmentSnapshot.captured_at == txn_date
            )
        )
        existing = (await self.db.execute(stmt)).scalar_one_or_none()
        
        if existing:
            existing.units_held += units
            existing.amount_invested_delta += invested_delta
            # Update total value based on new units * price (which we just fetched)
            existing.price_per_unit = price
            existing.total_value = existing.units_held * price
        else:
            # We need to know previous units to add to?
            # Or is this snapshot just the delta? 
            # "Time-series table... total_value". It implies Cumulative State.
            # So we need previous day's units.
            
            # Find closest previous snapshot
            prev_stmt = (
                select(InvestmentSnapshot)
                .where(
                    InvestmentSnapshot.holding_id == holding_id,
                    InvestmentSnapshot.captured_at < txn_date
                )
                .order_by(desc(InvestmentSnapshot.captured_at))
                .limit(1)
            )
            prev = (await self.db.execute(prev_stmt)).scalar_one_or_none()
            prev_units = prev.units_held if prev else 0.0
            
            new_units = prev_units + units
            snap = InvestmentSnapshot(
                holding_id=holding_id,
                user_id=transaction.user_id,
                captured_at=txn_date,
                units_held=new_units,
                price_per_unit=price,
                total_value=new_units * price,
                amount_invested_delta=invested_delta
            )
            self.db.add(snap)
            
        # Also, if we added a transaction in the PAST, we must propagate unit changes to ALL future snapshots.
        # This is complex. "Event sourcing" preferred but expensive.
        # We can run a "recalculate_holding" task.
        await self.recalculate_holding_history(holding_id)
        
        await self.db.commit()

    async def recalculate_holding_history(self, holding_id: uuid.UUID):
        """
        Re-runs the chain of units from start to finish.
        Used when inserting/updating a past transaction.
        """
        snapshots_stmt = (
            select(InvestmentSnapshot)
            .where(InvestmentSnapshot.holding_id == holding_id)
            .order_by(InvestmentSnapshot.captured_at)
        )
        snapshots = (await self.db.execute(snapshots_stmt)).scalars().all()
        
        running_units = 0.0
        total_invested = 0.0
        
        for snap in snapshots:
            # We assume amount_invested_delta is the source of truth for "Activity" on that day
            # If units were derived from price, we might need to preserve that ratio.
            # But simpler: Re-calculate units from delta / price.
            
            if snap.price_per_unit <= 0: snap.price_per_unit = 1.0 # Safety
            
            # Re-derive units for this day's action (convert Decimal to float)
            day_units = float(snap.amount_invested_delta) / float(snap.price_per_unit)
            
            running_units += day_units
            total_invested += float(snap.amount_invested_delta)
            
            snap.units_held = running_units
            snap.total_value = snap.units_held * float(snap.price_per_unit)
            
        # Update Holding Master Record
        holding = await self.db.get(InvestmentHolding, holding_id)
        if snapshots:
            holding.current_value = snapshots[-1].total_value
            holding.total_invested = total_invested
            holding.last_updated_at = datetime.now()
            
            # Trigger XIRR calc
            holding.xirr = self.calculate_xirr(snapshots)

    def calculate_xirr(self, snapshots: List[InvestmentSnapshot]) -> float:
        """
        Calculate XIRR based on input flows + current value.
        Flows: (Date, -amount_invested_delta)
        Terminal: (Last Date, +total_value)
        """
        if not snapshots:
            return 0.0
            
        dates = []
        amounts = []
        
        for s in snapshots:
            if abs(s.amount_invested_delta) > 0.01:
                dates.append(s.captured_at)
                # In XIRR:
                # Outflow (Investment) is negative.
                # Here amount_invested_delta is +ve for investment.
                # So we flip sign => -s.amount_invested_delta
                amounts.append(-s.amount_invested_delta)
        
        # Terminal Value
        last_snap = snapshots[-1]
        dates.append(last_snap.captured_at)
        amounts.append(last_snap.total_value) # Positive inflow if we sold it all today
        
        if len(amounts) < 2:
            return 0.0
            
        # Scipy XIRR Logic
        # Newton-Raphson method
        # 0 = sum( amount_i / (1 + xirr)^((date_i - date_0)/365) )
        
        try:
            dates_ord = [d.toordinal() for d in dates]
            d0 = dates_ord[0]
            
            def xnpv(rate):
                return sum([a / pow(1 + rate, (d - d0) / 365.0) for a, d in zip(amounts, dates_ord)])
                
            def xnpv_prime(rate):
                 return sum([- (d - d0) / 365.0 * a / pow(1 + rate, (d - d0) / 365.0 + 1) for a, d in zip(amounts, dates_ord)])

            # Initial guess 0.1 (10%)
            # If newton fails, return 0
            res = optimize.newton(xnpv, 0.1, fprime=xnpv_prime, maxiter=50)
            return res * 100 # Return percentage
        except Exception:
            return 0.0

    # --- Forecasting ---

    async def generate_forecast(self, user_id: uuid.UUID, years: int = 10) -> schemas.ForecastResponse:
        if not Prophet:
            return schemas.ForecastResponse(forecast=[], summary_text="Prophet forecasting unavailable.")
            
        # 1. Aggregate total portfolio value by day
        stmt = (
            select(
                InvestmentSnapshot.captured_at,
                func.sum(InvestmentSnapshot.total_value).label("total_val")
            )
            .where(InvestmentSnapshot.user_id == user_id)
            .group_by(InvestmentSnapshot.captured_at)
            .order_by(InvestmentSnapshot.captured_at)
        )
        
        rows = (await self.db.execute(stmt)).all()
        if len(rows) < 30: # Need some history
            return schemas.ForecastResponse(forecast=[], summary_text="Insufficient data for forecasting (need >30 data points).")
            
        df = pd.DataFrame(rows, columns=['ds', 'y'])
        
        # Prophet setup
        m = Prophet(daily_seasonality=False, yearly_seasonality=True)
        m.fit(df)
        
        future = m.make_future_dataframe(periods=years * 365)
        forecast = m.predict(future)
        
        # Extract relevant points
        # Filter strictly future
        last_date = df['ds'].max()
        future_forecast = forecast[forecast['ds'] > last_date]
        
        # Downsample to weekly or monthly to save bandwidth? 
        # API requires returning 'ForecastPoint'.
        
        result_points = []
        for index, row in future_forecast.iterrows():
            # Monthly sampling
            if row['ds'].day == 1:
                result_points.append(schemas.ForecastPoint(
                    date=row['ds'].date(),
                    yhat=row['yhat'],
                    yhat_lower=row['yhat_lower'],
                    yhat_upper=row['yhat_upper']
                ))
                
        # Calculate summary metrics
        final_val = result_points[-1].yhat if result_points else 0
        current_val = rows[-1].total_val
        growth = ((final_val - current_val) / current_val) * 100 if current_val > 0 else 0
        
        summary = f"Projected growth: {growth:.1f}%"
        
        return schemas.ForecastResponse(
            forecast=result_points,
            history=[
                schemas.ForecastPoint(
                    date=row.captured_at,
                    yhat=row.total_val,
                    yhat_lower=row.total_val,
                    yhat_upper=row.total_val
                ) for row in rows
            ],
            summary_text=summary
        )

    async def map_transaction(self, transaction_id: uuid.UUID, holding_id: uuid.UUID, create_rule: bool) -> bool:
        transaction = await self.db.get(Transaction, transaction_id)
        if not transaction:
            raise ValueError("Transaction not found")
            
        await self.add_transaction_to_holding(transaction, holding_id)
        
        if create_rule:
            # Create a rule for this merchant
            # Check if exists
            stmt = select(InvestmentMappingRule).where(
                and_(
                    InvestmentMappingRule.user_id == transaction.user_id,
                    InvestmentMappingRule.pattern == transaction.merchant_name
                )
            )
            existing = (await self.db.execute(stmt)).scalar_one_or_none()
            if not existing:
                rule = InvestmentMappingRule(
                    user_id=transaction.user_id,
                    holding_id=holding_id,
                    pattern=transaction.merchant_name,
                    match_type="CONTAINS" # Safe default
                )
                self.db.add(rule)
                await self.db.commit()
                
        return True

    async def sync_all_holdings_prices(self):
        """
        Fetches latest price for all holdings and updates snapshots for today.
        """
        # Fetch all active holdings
        stmt = select(InvestmentHolding)
        result = await self.db.execute(stmt)
        holdings = result.scalars().all()
        
        today = date.today()
        
        for holding in holdings:
            if not holding.ticker_symbol:
                continue
                
            try:
                price = await self.get_asset_price(holding, today)
                if price <= 0: continue
                
                # Check for existing snapshot today to update
                snap_stmt = select(InvestmentSnapshot).where(
                    and_(
                        InvestmentSnapshot.holding_id == holding.id,
                        InvestmentSnapshot.captured_at == today
                    )
                )
                existing = (await self.db.execute(snap_stmt)).scalar_one_or_none()
                
                if existing:
                    existing.price_per_unit = price
                    existing.total_value = existing.units_held * price
                else:
                    # Create new snapshot based on previous day's units
                    prev_stmt = (
                        select(InvestmentSnapshot)
                        .where(
                            InvestmentSnapshot.holding_id == holding.id,
                            InvestmentSnapshot.captured_at < today
                        )
                        .order_by(desc(InvestmentSnapshot.captured_at))
                        .limit(1)
                    )
                    prev = (await self.db.execute(prev_stmt)).scalar_one_or_none()
                    units = prev.units_held if prev else 0.0
                    
                    if units > 0:
                        new_snap = InvestmentSnapshot(
                            holding_id=holding.id,
                            user_id=holding.user_id,
                            captured_at=today,
                            units_held=units,
                            price_per_unit=price,
                            total_value=units * price,
                            amount_invested_delta=0.0
                        )
                        self.db.add(new_snap)
                        
                # Update holding master
                holding.current_value = (existing.units_held * price) if existing else (units * price)
                holding.last_updated_at = datetime.now()
                
            except Exception as e:
                logger.error(f"Failed to sync price for {holding.name}: {e}")
                
        await self.db.commit()

