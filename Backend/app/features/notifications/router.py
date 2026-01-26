from fastapi import APIRouter, Depends, status
from app.features.notifications.schemas import FCMTokenUpdate
from app.features.notifications.service import NotificationService
from app.core.middleware import get_current_user_id
import uuid

router = APIRouter()

@router.post("/token", status_code=status.HTTP_200_OK)
async def update_fcm_token(
    data: FCMTokenUpdate,
    user_id: uuid.UUID = Depends(get_current_user_id),
    service: NotificationService = Depends()
):
    """
    Update the FCM registration token for the current user.
    """
    await service.update_fcm_token(user_id, data.token)
    return {"message": "Token updated successfully"}
