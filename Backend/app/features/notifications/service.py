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
import json
import httpx

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

    async def send_inactivity_nudge(self, user_id: uuid.UUID, full_name: str, days_inactive: int):
        """Notify user if no transactions have been synced for a while."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.email:
            return

        name = self._derive_name(user.email, full_name)
        subject = f"We missed you, {name}!"
        sync_url = f"{settings.FRONTEND_ORIGIN}/sync"
        
        # Use AI for a variety of "I miss you" messages
        nudge_message = f"It has been {days_inactive} days since your last transaction was synced. Financial intelligence works best with fresh data!"
        if settings.GROQ_API_KEY:
             try:
                prompt = f"Write a friendly, short (1-2 sentences) personal finance assistant message for someone named {name} who hasn't synced their bank for {days_inactive} days. Encourage them to sync to keep their Safe-to-Spend accurate. Don't be robotic."
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"}
                payload = {
                    "model": settings.GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7
                }
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, headers=headers, json=payload, timeout=5.0)
                    if resp.status_code == 200:
                        nudge_message = resp.json()['choices'][0]['message']['content']
             except: pass

        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #111; border-radius: 12px; border-left: 5px solid #4F46E5;">
                    <h2 style="color: #4F46E5;">It's been a while...</h2>
                    <p>Hello {name},</p>
                    <p>{nudge_message}</p>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="{sync_url}" style="background: #111; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Sync Transactions Now</a>
                    </div>
                    <p style="font-size: 12px; color: #94a3b8;">You are receiving this because your automatic sync hasn't retrieved new data recently.</p>
                </div>
            </body>
        </html>
        """
        send_email(user.email, subject, html)

    async def send_weekend_insight(self, user_id: uuid.UUID, full_name: str, safe_to_spend: float):
        """Send a personalized, AI-generated weekend recommendation based on current Safe-to-Spend."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.email:
            return

        name = self._derive_name(user.email, full_name)
        
        # Use AI to generate a dynamic message
        ai_headline = "Ready for the Weekend?"
        ai_message = "Your Safe-to-Spend is ready for review. Have a great weekend!"
        ai_cta = "Check Spending Power"
        
        if settings.GROQ_API_KEY:
            try:
                prompt = f"""
                Act as a luxury personal finance assistant. 
                User: {name}
                Current Safe-to-Spend: ₹{safe_to_spend:,.0f}
                
                Task: Suggest a weekend plan in 1-2 sentences that fits this budget. 
                - If amount is big (e.g. > 10k), suggest something premium or social.
                - If amount is medium (e.g. 3k-10k), suggest a fun outing or nice dinner.
                - If amount is low (e.g. < 2k), suggest a cozy, insightful home evening or a park visit.
                
                Return JSON only:
                {{ "headline": "Catchy headline", "message": "The suggestion", "cta": "Short CTA text", "subject": "Email subject" }}
                """
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"}
                payload = {
                    "model": settings.GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.8
                }
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, headers=headers, json=payload, timeout=8.0)
                    if resp.status_code == 200:
                        data = json.loads(resp.json()['choices'][0]['message']['content'])
                        ai_headline = data.get("headline", ai_headline)
                        ai_message = data.get("message", ai_message)
                        ai_cta = data.get("cta", ai_cta)
                        subject = data.get("subject", f"Weekend Insight: ₹{safe_to_spend:,.0f}")
                    else:
                        subject = f"Weekend Insight: ₹{safe_to_spend:,.0f}"
            except Exception as e:
                logger.error(f"AI Insight error: {e}")
                subject = f"Weekend Insight: ₹{safe_to_spend:,.0f}"
        else:
            subject = f"Weekend Insight: ₹{safe_to_spend:,.0f}"

        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 16px; border-top: 6px solid #111;">
                    <h2 style="color: #111; margin-top: 0; font-size: 24px;">{ai_headline}</h2>
                    <p>Hello {name},</p>
                    <p style="font-size: 16px; color: #475569;">{ai_message}</p>
                    
                    <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; text-align: center; border: 1px solid #f1f5f9;">
                        <span style="display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">Safe-to-Spend Balance</span>
                        <span style="font-size: 32px; font-weight: 800; color: #1e293b;">₹{safe_to_spend:,.2f}</span>
                    </div>

                    <div style="margin: 30px 0; text-align: center;">
                        <a href="{settings.FRONTEND_ORIGIN}/dashboard" style="background: #111; color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">{ai_cta}</a>
                    </div>
                    
                    <p style="font-size: 13px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                        This safe-to-spend figure already accounts for your upcoming bills and recurring commitments.
                    </p>
                </div>
            </body>
        </html>
        """
        send_email(user.email, subject, html)

    async def send_inactivity_nudge(self, user_id: uuid.UUID, full_name: str, days_inactive: int):
        """Notify user if no transactions have been synced for a while."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.email:
            return

        name = self._derive_name(user.email, full_name)
        subject = f"We missed you, {name}!"
        sync_url = f"{settings.FRONTEND_ORIGIN}/sync"
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                    <h2 style="color: #4F46E5;">It's been a while...</h2>
                    <p>Hello {name},</p>
                    <p>It has been <strong>{days_inactive} days</strong> since your last transaction was synced with {settings.APP_NAME}.</p>
                    <p>Financial intelligence works best when it's continuous. Would you like to refresh your data now?</p>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="{sync_url}" style="background: #111; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Sync Transactions</a>
                    </div>
                </div>
            </body>
        </html>
        """
        send_email(user.email, subject, html)

    async def send_weekend_insight(self, user_id: uuid.UUID, full_name: str, safe_to_spend: float):
        """Send a weekend spend recommendation based on Safe-to-Spend health."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.email:
            return

        name = self._derive_name(user.email, full_name)
        subject = f"Weekend Insight: Your Safe-to-Spend is ₹{safe_to_spend:,.0f}"
        
        # Dynamic content based on health
        if safe_to_spend > 5000:
            headline = "Ready for the Weekend?"
            message = f"With a healthy Safe-to-Spend of <strong>₹{safe_to_spend:,.2f}</strong>, you've got room for a well-deserved treat. Maybe check out that new spot or plan a quick gateway?"
            cta = "View Spending Power"
        else:
            headline = "Cozy Weekend Ahead?"
            message = "Your Safe-to-Spend is a bit tight this week. It might be a perfect time for a relaxing movie night in or starting that book you've been meaning to read!"
            cta = "Check Budget"

        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px; border-top: 4px solid #4F46E5;">
                    <h2 style="color: #111;">{headline}</h2>
                    <p>Hello {name},</p>
                    <p>{message}</p>
                    <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
                        <span style="display: block; font-size: 14px; text-transform: uppercase; color: #64748b; margin-bottom: 5px;">Current Safe-to-Spend</span>
                        <span style="font-size: 28px; font-weight: bold; color: #1e293b;">₹{safe_to_spend:,.2f}</span>
                    </div>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="{settings.FRONTEND_ORIGIN}/dashboard" style="background: #111; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">{cta}</a>
                    </div>
                </div>
            </body>
        </html>
        """
        send_email(user.email, subject, html)
