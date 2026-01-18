from decimal import Decimal
from datetime import date, datetime, timedelta
from calendar import monthrange
from typing import Dict, Optional


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
        reference_date = date.today()
    
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
        reference_date = date.today()
    
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
        reference_date = date.today()
    
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
        reference_date = date.today()
    
    year_start = date(reference_date.year, 1, 1)
    year_end = date(reference_date.year, 12, 31)
    
    return {
        "year_start": year_start,
        "year_end": year_end
    }
