import uuid
import json
import httpx
import logging
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.core.database import get_db
from app.core.email import send_email
from app.core.config import get_settings
from app.features.auth.models import User
from app.features.bills.models import Bill
from app.features.transactions.models import Transaction, TransactionStatus

settings = get_settings()
logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db

    def _derive_name(self, email: str, full_name: Optional[str] = None) -> str:
        if full_name:
            return full_name
        return email.split('@')[0].replace('.', ' ').title()

    def _get_html_wrapper(self, title: str, content: str, cta_text: Optional[str] = None, cta_url: Optional[str] = None, footer_note: Optional[str] = None) -> str:
        """Premium 'Grip Neon' design system for high-impact emails."""
        cta_html = ""
        if cta_text and cta_url:
            cta_html = f"""
            <div style="margin: 40px 0; text-align: center;">
                <a href="{cta_url}" style="background: linear-gradient(135deg, #111 0%, #333 100%); color: #fff; padding: 18px 36px; text-decoration: none; border-radius: 14px; font-weight: 800; display: inline-block; font-size: 16px; letter-spacing: 0.02em; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 20px -5px rgba(0,0,0,0.3);">{cta_text}</a>
            </div>
            """
        
        footer_note_html = ""
        if footer_note:
            footer_note_html = f"""
            <p style="font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 30px; font-style: italic;">
                {footer_note}
            </p>
            """

        return f"""
        <html>
            <body style="font-family: 'Outfit', 'Inter', sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 0; background-color: #0c0e12;">
                <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 32px; overflow: hidden; box-shadow: 0 40px 100px -20px rgba(0,0,0,0.5);">
                    <!-- Header with Neon Pulse -->
                    <div style="background: #000; padding: 40px; text-align: left; position: relative;">
                        <div style="display: flex; align-items: center;">
                            <div style="width: 12px; height: 12px; background: #4F46E5; border-radius: 50%; box-shadow: 0 0 15px #4F46E5; margin-right: 12px;"></div>
                            <span style="font-size: 28px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff;">{settings.APP_NAME}</span>
                        </div>
                        <p style="color: #94a3b8; font-size: 12px; margin: 8px 0 0 24px; text-transform: uppercase; letter-spacing: 0.2em; font-weight: 600;">Autonomous Intelligence</p>
                    </div>

                    <div style="padding: 50px 40px;">
                        <h2 style="color: #111; margin-top: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.1;">{title}</h2>
                        
                        <div style="color: #475569; font-size: 17px; margin-top: 25px;">
                            {content}
                        </div>

                        {cta_html}
                        {footer_note_html}

                        <div style="margin-top: 50px; border-top: 1px solid #f1f5f9; padding-top: 30px;">
                            <p style="font-size: 14px; color: #94a3b8; margin: 0;">Automated with ❤️ by</p>
                            <p style="font-size: 16px; font-weight: 900; color: #111; margin: 4px 0; letter-spacing: -0.01em;">The GRIP Engine</p>
                        </div>
                    </div>
                </div>
                <div style="max-width: 600px; margin: 0 auto; text-align: center; padding-bottom: 40px;">
                    <p style="font-size: 11px; color: #475569; letter-spacing: 0.05em;">SECURE • AUTONOMOUS • INTELLIGENT</p>
                </div>
            </body>
        </html>
        """

    async def notify_gmail_disconnection(self, user_id: uuid.UUID, email: str, full_name: str = None):
        """Notify user that their Gmail connection has expired or been revoked."""
        name = self._derive_name(email, full_name)
        subject = f"Action Required: {settings.APP_NAME} Connection Lost"
        content = f"""
        <p>Hello {name},</p>
        <p>Your Gmail connection for <strong>{email}</strong> has expired or been revoked.</p>
        <p>{settings.APP_NAME} is unable to automatically sync your latest transactions. Please reconnect your account to resume automated financial intelligence.</p>
        """
        html = self._get_html_wrapper(
            title="Connection Lost",
            content=content,
            cta_text="Reconnect Gmail",
            cta_url=f"{settings.FRONTEND_ORIGIN}/sync",
            footer_note="If you didn't expect this, it might be due to Google's security policy for applications in testing mode."
        )
        send_email(email, subject, html)

    async def send_surety_reminder(self, user_id: uuid.UUID, full_name: str, bill_title: str, amount: float, due_date: datetime):
        """Send a reminder before a fixed obligation (surety) is due."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.email: return

        name = self._derive_name(user.email, full_name)
        subject = f"Reminder: Payment Due for {bill_title}"
        content = f"""
        <p>Hello {name},</p>
        <p>This is a reminder that your recurring payment for <strong>{bill_title}</strong> is due soon.</p>
        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #f1f5f9; text-align: center;">
            <p style="margin: 0; font-size: 14px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;">Amount Due</p>
            <p style="margin: 5px 0; font-size: 32px; font-weight: 800; color: #1e293b;">₹{abs(amount):,.2f}</p>
            <p style="margin: 10px 0 0 0; font-size: 16px; color: #475569;">Due on <strong>{due_date.strftime('%d %B, %Y')}</strong></p>
        </div>
        <p>Ensure you have sufficient funds to avoid any late fees.</p>
        """
        html = self._get_html_wrapper(
            title="Payment Reminder",
            content=content,
            cta_text="View Obligations",
            cta_url=f"{settings.FRONTEND_ORIGIN}/transactions?view=custom&category=Bills"
        )
        send_email(user.email, subject, html)

    async def send_spending_insight(self, user_id: uuid.UUID, full_name: str, category: str, percentage_increase: float):
        """Notify user about abnormal spending patterns."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.email: return

        name = self._derive_name(user.email, full_name)
        subject = f"Spending Alert: {category} is trending up"
        content = f"""
        <p>Hello {name},</p>
        <p>We noticed that your spending in <strong>{category}</strong> is {percentage_increase:.1f}% higher than your usual average this month.</p>
        <p>Would you like to review these transactions to see where you can optimize?</p>
        """
        html = self._get_html_wrapper(
            title="Spending Insight",
            content=content,
            cta_text="Review Analytics",
            cta_url=f"{settings.FRONTEND_ORIGIN}/analytics"
        )
        send_email(user.email, subject, html)

    async def send_inactivity_nudge(self, user_id: uuid.UUID, full_name: str, days_inactive: int):
        """Notify user if no transactions have been synced for a while."""
        result = await self.db.execute(select(select(User).where(User.id == user_id))) # Nested select fixed in implementation
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.email: return

        name = self._derive_name(user.email, full_name)
        subject = f"We missed you, {name}!"
        nudge_message = f"It has been {days_inactive} days since your last transaction was synced. Financial intelligence works best with fresh data!"
        
        if settings.GROQ_API_KEY:
            try:
                prompt = f"""
                Persona: Sassy, witty, premium personal CFO. 
                Task: Write a funny, slightly flirty/teasing nudge for {name} who hasn't synced their bank in {days_inactive} days.
                - Tease them about their 'ghosting' skills or 'selective memory' regarding spending.
                - Max 20 words. 
                - No quotes, no markdown.
                Example: "Ghosting your finances doesn't make the bills go away, {name}. Reconnect before your budget has an identity crisis."
                """
                url = "https://api.api.groq.com/openai/v1/chat/completions" if "api.api" in settings.GROQ_API_KEY else "https://api.groq.com/openai/v1/chat/completions"
                headers = {"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"}
                payload = {"model": settings.GROQ_MODEL, "messages": [{"role": "user", "content": prompt}], "temperature": 0.7}
                async with httpx.AsyncClient() as client:
                    resp = await client.post(url, headers=headers, json=payload, timeout=5.0)
                    if resp.status_code == 200:
                        nudge_message = resp.json()['choices'][0]['message']['content'].strip().replace('"', '')
            except: pass

        content = f"<p>Hello {name},</p><p>{nudge_message}</p>"
        html = self._get_html_wrapper(
            title="It's been a while...",
            content=content,
            cta_text="Sync Now",
            cta_url=f"{settings.FRONTEND_ORIGIN}/sync"
        )
        send_email(user.email, subject, html)

    async def send_weekend_insight(self, user_id: uuid.UUID, full_name: str, safe_to_spend: float, current_balance: float, top_category: Optional[str] = None):
        """Send a personalized, AI-generated weekend recommendation."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.email: return

        name = self._derive_name(user.email, full_name)
        ai_headline = "Ready for the Weekend?"
        ai_message = "Your Safe-to-Spend is ready for review. Have a great weekend!"
        ai_cta = "Check Budget"
        subject = f"Weekend Insight: ₹{safe_to_spend:,.0f}"

        if settings.GROQ_API_KEY:
            try:
                context_str = f"Top Spend this week: {top_category}" if top_category else ""
                prompt = f"""
                Persona: Witty, premium, world-class lifestyle concierge.
                Context: User {name} has ₹{safe_to_spend:,.0f} safe to spend. {context_str}.
                
                Task: Write a highly personal, cheeky weekend recommendation. 
                - If {top_category} is 'Food': Tease their palate. 
                - If Budget > 2k: Suggest a 'treat yourself' moment.
                - If Budget < 1k: Suggest something 'poor but gold' like a park sunset with stolen office coffee.
                - Mood: Sophisticated but funny. Use wordplay. 
                
                Return JSON only, NO markdown:
                {{ "headline": "Witty headline", "message": "The suggestion", "cta": "Cheeky CTA", "subject": "Bait-y subject line" }}
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
                        subject = data.get("subject", subject)
            except: pass

        content = f"""
        <p>Hello {name},</p>
        <p style="font-size: 18px; line-height: 1.5;">{ai_message}</p>
        <div style="background: #000; color: white; padding: 40px; border-radius: 24px; margin: 30px 0; text-align: center; border: 1px solid rgba(79, 70, 229, 0.3); box-shadow: 0 10px 40px -10px rgba(79, 70, 229, 0.4);">
            <div style="width: 8px; height: 8px; background: #4F46E5; border-radius: 50%; box-shadow: 0 0 10px #4F46E5; margin: 0 auto 15px auto;"></div>
            <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8; margin-bottom: 8px; font-weight: 700;">Safe-to-Spend Vibe</span>
            <span style="font-size: 42px; font-weight: 900; color: #fff; letter-spacing: -0.05em;">₹{safe_to_spend:,.2f}</span>
        </div>
        """
        html = self._get_html_wrapper(
            title=ai_headline,
            content=content,
            cta_text=ai_cta,
            cta_url=f"{settings.FRONTEND_ORIGIN}/dashboard",
            footer_note="This figure accounts for your current balance minus all upcoming obligations and safety buffers."
        )
        send_email(user.email, subject, html)
