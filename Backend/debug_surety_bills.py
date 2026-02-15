import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def main():
    async with AsyncSessionLocal() as db:
        print("--- DEBUG: Check Bills ---")
        
        # 1. Look for Bills with SIP
        query = text("SELECT id, title, amount, due_date, is_paid, is_recurring, sub_category FROM bills WHERE sub_category = 'SIP' OR title LIKE '%SIP%'")
        res = await db.execute(query)
        bills = res.fetchall()
        
        if not bills:
            print("No bills found for SIP.")
        else:
            for b in bills:
                print(f"BILL: ID={b.id} | Title='{b.title}' | Sub='{b.sub_category}' | Amt={b.amount} | Due={b.due_date} | Paid={b.is_paid} | Recur={b.is_recurring}")

if __name__ == "__main__":
    asyncio.run(main())
