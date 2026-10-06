from fastapi import APIRouter, Depends
from fastapi.responses import Response
from typing import Annotated
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.export.service import generate_csv_export, generate_portfolio_statement_excel

router = APIRouter()

@router.get("/csv")
async def export_transactions_csv(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Export all transactions as a CSV file.
    """
    csv_content = await generate_csv_export(db, current_user.id)
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=grip_transactions_backup.csv"
        }
    )

@router.get("/portfolio-statement")
async def export_portfolio_statement(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Export comprehensive financial portfolio statement & asset schedule in Excel (.xlsx) format.
    Includes consolidated net worth summary, bank deposits, market portfolios, retirement schemes,
    credit cards, and institutional transfer references.
    """
    excel_stream = await generate_portfolio_statement_excel(db, current_user)
    today_str = date.today().strftime("%Y-%m-%d")
    filename = f"Grip_Portfolio_Statement_{today_str}.xlsx"
    
    return Response(
        content=excel_stream.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


