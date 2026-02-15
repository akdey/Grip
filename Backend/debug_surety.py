import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from datetime import date

async def main():
    async with AsyncSessionLocal() as db:
        print("--- DEBUG: Check Sureties ---")
        
        # 1. Look for Jan 18 transaction (potential surety source)
        query_jan = text("SELECT id, amount, merchant_name, sub_category, is_surety FROM transactions WHERE transaction_date = '2026-01-18'")
        res_jan = await db.execute(query_jan)
        jan_txns = res_jan.fetchall()
        
        # Check Feb Count
        res = await db.execute(text("SELECT COUNT(*) FROM transactions WHERE transaction_date >= '2026-02-01'"))
        count = res.scalar()
        print(f"\n--- FEB Transacion Count: {count} ---")
        
        if count > 0:
            res_ex = await db.execute(text("SELECT id, transaction_date, amount, merchant_name, sub_category FROM transactions WHERE transaction_date >= '2026-02-01' ORDER BY transaction_date DESC LIMIT 5"))
            for r in res_ex.fetchall():
                print(r)
        
        # Check large transactions
        print("\n--- All transactions > 1000 in Feb ---")
        res_large = await db.execute(text("SELECT id, transaction_date, amount, merchant_name, sub_category FROM transactions WHERE ABS(amount) > 1000 AND transaction_date >= '2026-02-01'"))
        large = res_large.fetchall()
        if not large:
            print("None found.")
        else:
            for r in large:
                print(r)

if __name__ == "__main__":
    asyncio.run(main())
