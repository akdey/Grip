import uuid
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from app.core.database import get_db
from app.core.email import send_email
from app.features.auth.models import User
from app.features.bills.models import Bill
from app.features.transactions.models import Transaction, TransactionStatus
import logging

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db

    def _derive_name(self, email: str, full_name: Optional[str] = None) -> str:
        if full_name:
            return full_name
        # Extract name from email: amit.dey@gmail.com -> amit.dey
        return email.split('@')[0].replace('.', ' ').title()

    async def notify_gmail_disconnection(self, user_id: uuid.UUID, email: str, full_name: str = None):
        """Notify user that their Gmail connection has expired or been revoked."""
        name = self._derive_name(email, full_name)
        subject = f"Action Required: {settings.APP_NAME} Connection Lost"
        sync_url = f"{settings.FRONTEND_ORIGIN}/sync"
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="color: #4F46E5;">Gmail Disconnected</h2>
                    <p>Hello {name},</p>
                    <p>Your Gmail connection for <strong>{email}</strong> has expired or been revoked.</p>
                    <p>{settings.APP_NAME} is unable to automatically sync your latest transactions. Please reconnect your account to resume automated financial intelligence.</p>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="{sync_url}" style="background: #111; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reconnect Gmail</a>
                    </div>
                    <p style="font-size: 12px; color: #666;">If you didn't expect this, it might be due to Google's security policy for applications in testing mode.</p>
                </div>
            </body>
        </html>
        """
        send_email(email, subject, html)

    async def send_surety_reminder(self, user_id: uuid.UUID, full_name: str, bill_title: str, amount: float, due_date: datetime):
        """Send a reminder before a fixed obligation (surety) is due."""
        # Fetch user email
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.email:
            return

        name = self._derive_name(user.email, full_name)
        subject = f"Reminder: Payment Due for {bill_title}"
        bills_url = f"{settings.FRONTEND_ORIGIN}/transactions?view=custom&category=Bills"
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="color: #4F46E5;">Payment Reminder</h2>
                    <p>Hello {name},</p>
                    <p>This is a reminder that your recurring payment for <strong>{bill_title}</strong> is due soon.</p>
                    <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #f1f5f9;">
                        <p style="margin: 5px 0; font-size: 18px;"><strong>Amount:</strong> ₹{abs(amount):,.2f}</p>
                        <p style="margin: 5px 0;"><strong>Due Date:</strong> {due_date.strftime('%d %B, %Y')}</p>
                    </div>
                    <p>Ensure you have sufficient funds to avoid any late fees.</p>
                    <div style="margin: 25px 0;">
                        <a href="{bills_url}" style="color: #4F46E5; font-weight: bold; text-decoration: none;">View Obligation Ledger →</a>
                    </div>
                </div>
            </body>
        </html>
        """
        send_email(user.email, subject, html)

    async def send_spending_insight(self, user_id: uuid.UUID, full_name: str, category: str, percentage_increase: float):
        """Notify user about abnormal spending patterns."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.email:
            return

        name = self._derive_name(user.email, full_name)
        subject = f"Spending Alert: {category} is trending up"
        analytics_url = f"{settings.FRONTEND_ORIGIN}/analytics"
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="color: #EF4444;">Spending Insight</h2>
                    <p>Hello {name},</p>
                    <p>We noticed that your spending in <strong>{category}</strong> is {percentage_increase:.1f}% higher than your usual average this month.</p>
                    <p>Would you like to review these transactions to see where you can optimize?</p>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="{analytics_url}" style="background: #111; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Review Analytics</a>
                    </div>
                </div>
            </body>
        </html>
        """
        send_email(user.email, subject, html)
