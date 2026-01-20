from fastapi import APIRouter, Depends
from fastapi.responses import Response
from typing import Annotated
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.features.auth.deps import get_current_user
from app.features.auth.models import User
from app.features.export.service import generate_csv_export

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
