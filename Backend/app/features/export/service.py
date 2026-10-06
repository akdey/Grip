import csv
import io
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.features.transactions.models import Transaction
from app.features.credit_cards.models import CreditCard
from app.features.bills.models import Bill
from app.features.wealth.models import InvestmentHolding

async def generate_csv_export(db: AsyncSession, user_id: str) -> str:
    """
    Generates a CSV string containing all transaction data for the user.
    """
    stmt = select(Transaction).where(Transaction.user_id == user_id).order_by(Transaction.transaction_date.desc())
    result = await db.execute(stmt)
    transactions = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Date", "Amount", "Currency", "Merchant", "Category", 
        "Sub Category", "Account Type", "Status", "Is Manual", "Remarks", "Tags"
    ])

    for t in transactions:
        writer.writerow([
            t.transaction_date.isoformat() if t.transaction_date else "",
            t.amount,
            t.currency,
            t.merchant_name or "",
            t.category,
            t.sub_category,
            t.account_type,
            t.status,
            "Yes" if t.is_manual else "No",
            t.remarks or "",
            ",".join(t.tags) if t.tags else ""
        ])
    
    return output.getvalue()


async def generate_portfolio_statement_excel(db: AsyncSession, user) -> io.BytesIO:
    """
    Fetches all investment holdings, credit cards, and bills for the user,
    and generates the comprehensive personal financial portfolio statement workbook.
    """
    from sqlalchemy.orm import selectinload
    from app.features.wealth.models import InvestmentHolding
    from app.features.credit_cards.models import CreditCard
    from app.features.bills.models import Bill
    from app.features.export.portfolio_statement import generate_portfolio_statement_workbook

    # 1. Fetch Investment Holdings with snapshots
    holdings_stmt = (
        select(InvestmentHolding)
        .where(InvestmentHolding.user_id == user.id)
        .options(selectinload(InvestmentHolding.snapshots))
        .order_by(InvestmentHolding.asset_type, InvestmentHolding.name)
    )
    holdings_res = await db.execute(holdings_stmt)
    holdings = holdings_res.scalars().all()

    # 2. Fetch Credit Cards
    cards_stmt = (
        select(CreditCard)
        .where(CreditCard.user_id == user.id)
        .order_by(CreditCard.card_name)
    )
    cards_res = await db.execute(cards_stmt)
    credit_cards = cards_res.scalars().all()

    # 3. Fetch Bills
    bills_stmt = (
        select(Bill)
        .where(Bill.user_id == user.id)
        .order_by(Bill.due_date)
    )
    bills_res = await db.execute(bills_stmt)
    bills = bills_res.scalars().all()

    return generate_portfolio_statement_workbook(
        user=user,
        holdings=holdings,
        credit_cards=credit_cards,
        bills=bills
    )

