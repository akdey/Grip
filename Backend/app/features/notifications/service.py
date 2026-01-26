import firebase_admin
from firebase_admin import credentials, messaging
from app.core.config import get_settings
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from app.core.database import get_db
from app.features.auth.models import User
import logging
from sqlalchemy import select, update
import uuid
from typing import List, Optional

settings = get_settings()
logger = logging.getLogger(__name__)

# Initialize Firebase App
try:
    if not firebase_admin._apps:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized successfully.")
except Exception as e:
    logger.warning(f"Failed to initialize Firebase Admin SDK: {e}. Notifications will be logged only.")

class NotificationService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db

    async def update_fcm_token(self, user_id: uuid.UUID, token: str):
        """Update the FCM token for a user."""
        stmt = (
            update(User)
            .where(User.id == user_id)
            .values(fcm_token=token)
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def get_user_token(self, user_id: uuid.UUID) -> Optional[str]:
        stmt = select(User.fcm_token).where(User.id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def send_notification(self, user_id: uuid.UUID, title: str, body: str, data: dict = None):
        """Send a push notification to the user."""
        token = await self.get_user_token(user_id)
        
        if not token:
            logger.info(f"No FCM token found for user {user_id}. Skipping notification: {title}")
            return

        if not firebase_admin._apps:
            logger.info(f"[MOCK] Sending notification to {user_id}: {title} - {body}")
            return

        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                token=token,
            )
            response = messaging.send(message)
            logger.info(f"Successfully sent message: {response}")
        except Exception as e:
            logger.error(f"Error sending FCM message: {e}")

    async def send_pending_transactions_notification(self, user_id: uuid.UUID, count: int, transactions: List[dict]):
        """
        Send a notification about pending transactions.
        If multiple, sends a summary. If single, sends details.
        """
        if count == 0:
            return

        if count == 1:
            txn = transactions[0]
            merchant = txn.get("merchant_name", "Unknown Merchant")
            amount = txn.get("amount", 0)
            currency = txn.get("currency", "INR")
            
            title = "New Transaction Pending"
            body = f"An expense of {currency} {abs(amount)} at {merchant} requires your approval."
            data = {"type": "pending_transaction", "transaction_id": str(txn.get("id"))}
        else:
            title = "Pending Transactions"
            body = f"You have {count} new transactions waiting for your review."
            data = {"type": "pending_transactions_batch", "count": str(count)}

        await self.send_notification(user_id, title, body, data)
