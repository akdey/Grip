import csv
import io
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.features.transactions.models import Transaction

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
