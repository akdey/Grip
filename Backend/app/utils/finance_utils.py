from decimal import Decimal
from datetime import date, datetime, timedelta
import zoneinfo
from calendar import monthrange
from typing import Dict, Optional
from app.core.config import get_settings


from enum import Enum

class TransactionBehavior(str, Enum):
    DIRECT_EXPENSE = "DIRECT_EXPENSE"       # Outflow from liquid accounts (SAVINGS, CASH) for goods/services
    CREDIT_EXPENSE = "CREDIT_EXPENSE"       # Outflow from liability accounts (CREDIT_CARD) for goods/services
    DEBT_TRANSFER = "DEBT_TRANSFER"         # Outflow from liquid account (SAVINGS/CASH) to settle credit card liability
    CAPITAL_OUTFLOW = "CAPITAL_OUTFLOW"     # Outflow from liquid account (SAVINGS/CASH) for wealth accumulation / investments
    INCOME = "INCOME"                       # Inflow to liquid accounts
    SETTLEMENT_CREDIT = "SETTLEMENT_CREDIT" # Credit to CREDIT_CARD liability account offsetting debt
    OTHER = "OTHER"

INVESTMENT_SUBCATEGORIES = [
    "sip",
    "recurring deposit (rd)",
    "fixed deposit (fd)",
    "mutual funds",
    "mutual fund",
    "pli",
    "apy",
    "stocks",
    "stock",
    "shares",
    "share",
    "equity",
    "gold",
    "silver",
    "nps",
    "ppf",
    "epf",
    "etf",
    "bonds",
    "bond",
    "crypto",
    "cryptocurrency",
    "real estate",
    "reit",
    "investment",
    "investments",
]

def get_investment_sql_condition():
    """
    Returns a composite SQLAlchemy boolean condition identifying investment transactions:
    - category matches '%invest%'
    - sub_category matches '%invest%'
    - sub_category in known investment instruments (SIP, RD, FD, Mutual Funds, PLI, APY, Stocks, Gold, etc.)
    - category matches any Category where Category.type == 'INVESTMENT'
    - sub_category matches any SubCategory where SubCategory.type == 'INVESTMENT'
    """
    from sqlalchemy import select, func, or_
    from app.features.categories.models import Category, SubCategory
    from app.features.transactions.models import Transaction

    inv_cat_subq = select(Category.name).where(Category.type == "INVESTMENT")
    inv_subcat_subq = select(SubCategory.name).where(SubCategory.type == "INVESTMENT")

    return or_(
        func.lower(Transaction.category).like("%invest%"),
        func.lower(Transaction.sub_category).like("%invest%"),
        func.lower(Transaction.sub_category).in_(INVESTMENT_SUBCATEGORIES),
        Transaction.category.in_(inv_cat_subq),
        Transaction.sub_category.in_(inv_subcat_subq)
    )

def classify_transaction(
    account_type: Optional[str],
    category: Optional[str],
    sub_category: Optional[str],
    amount: Decimal
) -> TransactionBehavior:
    """
    Classify transaction into fundamental behavioral accounting types:
    1. DIRECT_EXPENSE: Outflow from liquid accounts (SAVINGS, CASH) for goods/services.
    2. CREDIT_EXPENSE: Outflow from liability accounts (CREDIT_CARD) for goods/services.
    3. DEBT_TRANSFER: Movement from liquid account (SAVINGS) to settle liability (CREDIT_CARD).
    4. CAPITAL_OUTFLOW: Capital moved from liquid accounts into wealth accumulation / investments.
    """
    sub_cat_clean = (sub_category or "").strip().lower()
    acc_clean = (account_type or "").strip().upper()
    cat_clean = (category or "").strip().lower()

    is_cc_payment = sub_cat_clean == "credit card payment"

    if is_cc_payment:
        if acc_clean in ("SAVINGS", "CASH", "ACCOUNT"):
            return TransactionBehavior.DEBT_TRANSFER
        elif acc_clean == "CREDIT_CARD":
            return TransactionBehavior.SETTLEMENT_CREDIT if amount > 0 else TransactionBehavior.CREDIT_EXPENSE

    if cat_clean == "income" or (amount > 0 and acc_clean != "CREDIT_CARD"):
        return TransactionBehavior.INCOME

    is_investment = (
        "invest" in cat_clean
        or "invest" in sub_cat_clean
        or sub_cat_clean in INVESTMENT_SUBCATEGORIES
    )

    if is_investment and amount < 0 and acc_clean in ("SAVINGS", "CASH", "ACCOUNT"):
        return TransactionBehavior.CAPITAL_OUTFLOW

    if acc_clean == "CREDIT_CARD":
        return TransactionBehavior.CREDIT_EXPENSE

    if acc_clean in ("SAVINGS", "CASH", "ACCOUNT"):
        return TransactionBehavior.DIRECT_EXPENSE

    return TransactionBehavior.OTHER


def get_current_date() -> date:
    """Get the current date in the configured timezone."""
    settings = get_settings()
    tz = zoneinfo.ZoneInfo(settings.APP_TIMEZONE)
    return datetime.now(tz).date()


def calculate_frozen_funds(
    unpaid_bills: Decimal,
    projected_surety: Decimal,
    unbilled_cc: Decimal
) -> Decimal:
    """
    Calculate total frozen funds that should not be spent.
    
    Formula: Frozen = UnpaidBills + ProjectedSuretyBills + CurrentUnbilledCC
    
    Args:
        unpaid_bills: Total amount of unpaid bills
        projected_surety: Projected recurring bills (rent, utilities, etc.)
        unbilled_cc: Current unbilled credit card spending
        
    Returns:
        Total frozen funds amount
    """
    return unpaid_bills + projected_surety + unbilled_cc


def calculate_safe_to_spend(
    current_balance: Decimal,
    frozen_funds: Decimal,
    buffer_percentage: float = 0.10
) -> Decimal:
    """
    Calculate safe-to-spend amount with buffer.
    
    Formula: Safe-to-Spend = Balance - Frozen - Buffer
    
    Args:
        current_balance: Current liquid balance
        frozen_funds: Total frozen funds (from calculate_frozen_funds)
        buffer_percentage: Safety buffer percentage (default 10%)
        
    Returns:
        Safe amount to spend
    """
    buffer = current_balance * Decimal(str(buffer_percentage))
    safe_amount = current_balance - frozen_funds - buffer
    return max(Decimal("0"), safe_amount)


def get_billing_cycle_dates(
    statement_date: int,
    reference_date: Optional[date] = None
) -> Dict[str, date]:
    """
    Calculate billing cycle dates for a credit card.
    
    Args:
        statement_date: Day of month when statement is generated (1-31)
        reference_date: Reference date for calculation (defaults to today)
        
    Returns:
        Dictionary with cycle_start, cycle_end, next_statement_date
    """
    if reference_date is None:
        reference_date = get_current_date()
    
    # Determine current or next statement date
    current_month_statement = date(
        reference_date.year,
        reference_date.month,
        min(statement_date, monthrange(reference_date.year, reference_date.month)[1])
    )
    
    if reference_date <= current_month_statement:
        # We're in the current billing cycle
        next_statement_date = current_month_statement
        
        # Calculate previous month's statement date
        if reference_date.month == 1:
            prev_month = 12
            prev_year = reference_date.year - 1
        else:
            prev_month = reference_date.month - 1
            prev_year = reference_date.year
        
        cycle_start = date(
            prev_year,
            prev_month,
            min(statement_date, monthrange(prev_year, prev_month)[1])
        ) + timedelta(days=1)
        
        cycle_end = current_month_statement
    else:
        # Statement has passed, we're in next cycle
        if reference_date.month == 12:
            next_month = 1
            next_year = reference_date.year + 1
        else:
            next_month = reference_date.month + 1
            next_year = reference_date.year
        
        next_statement_date = date(
            next_year,
            next_month,
            min(statement_date, monthrange(next_year, next_month)[1])
        )
        
        cycle_start = current_month_statement + timedelta(days=1)
        cycle_end = next_statement_date
    
    return {
        "cycle_start": cycle_start,
        "cycle_end": cycle_end,
        "next_statement_date": next_statement_date,
        "days_until_statement": (next_statement_date - reference_date).days
    }


def calculate_variance_percentage(current: Decimal, previous: Decimal) -> float:
    """
    Calculate percentage variance between two values.
    
    Args:
        current: Current period value
        previous: Previous period value
        
    Returns:
        Percentage change (positive = increase, negative = decrease)
    """
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    
    variance = ((current - previous) / previous) * 100
    return float(variance)


def get_trend_indicator(variance_percentage: float, threshold: float = 5.0) -> str:
    """
    Get trend indicator based on variance percentage.
    
    Args:
        variance_percentage: Percentage variance
        threshold: Threshold for considering change significant
        
    Returns:
        "up", "down", or "stable"
    """
    if abs(variance_percentage) < threshold:
        return "stable"
    return "up" if variance_percentage > 0 else "down"


def get_month_date_range(reference_date: Optional[date] = None) -> Dict[str, date]:
    """
    Get start and end dates for the current month.
    
    Args:
        reference_date: Reference date (defaults to today)
        
    Returns:
        Dictionary with month_start and month_end
    """
    if reference_date is None:
        reference_date = get_current_date()
    
    month_start = date(reference_date.year, reference_date.month, 1)
    last_day = monthrange(reference_date.year, reference_date.month)[1]
    month_end = date(reference_date.year, reference_date.month, last_day)
    
    return {
        "month_start": month_start,
        "month_end": month_end
    }


def get_previous_month_date_range(reference_date: Optional[date] = None) -> Dict[str, date]:
    """
    Get start and end dates for the previous month.
    
    Args:
        reference_date: Reference date (defaults to today)
        
    Returns:
        Dictionary with month_start and month_end
    """
    if reference_date is None:
        reference_date = get_current_date()
    
    if reference_date.month == 1:
        prev_month = 12
        prev_year = reference_date.year - 1
    else:
        prev_month = reference_date.month - 1
        prev_year = reference_date.year
    
    month_start = date(prev_year, prev_month, 1)
    last_day = monthrange(prev_year, prev_month)[1]
    month_end = date(prev_year, prev_month, last_day)
    
    return {
        "month_start": month_start,
        "month_end": month_end
    }


def get_year_date_range(reference_date: Optional[date] = None) -> Dict[str, date]:
    """
    Get start and end dates for the current year.
    
    Args:
        reference_date: Reference date (defaults to today)
        
    Returns:
        Dictionary with year_start and year_end
    """
    if reference_date is None:
        reference_date = get_current_date()
    
    year_start = date(reference_date.year, 1, 1)
    year_end = date(reference_date.year, 12, 31)
    
    return {
        "year_start": year_start,
        "year_end": year_end
    }

