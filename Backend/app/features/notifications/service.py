import uuid
import logging
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.core.database import get_db
from app.core.email import send_email
from app.core.config import get_settings
from app.core.llm import get_llm_service, LLMService
from app.features.auth.models import User
from app.features.bills.models import Bill
from app.features.transactions.models import Transaction, TransactionStatus

settings = get_settings()
logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, db: AsyncSession = Depends(get_db), llm: LLMService = Depends(get_llm_service)):
        self.db = db
        # If instantiated manually (e.g. in scheduler), llm will be the Depends object
        from app.core.llm import LLMService as ActualLLMService
        if isinstance(llm, ActualLLMService):
            self.llm = llm
        else:
            from app.core.llm import get_llm_service
            self.llm = get_llm_service()

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

    async def send_spending_insight(self, user_id: uuid.UUID, full_name: str, category: str, amount: float, percentage_increase: float):
        """Notify user about abnormal spending patterns with a cheeky 'Roast'."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.email: return

        name = self._derive_name(user.email, full_name)
        subject = f"Category Alert: Your {category} spend is getting loud"
        
        roast_message = f"We noticed that your spending in {category} is {percentage_increase:.1f}% higher than your usual average this month."
        
        if self.llm.is_enabled:
            prompt = f"""
            Persona: Sassy, witty, premium personal CFO.
            Task: Write a funny, slightly brutal 'Roast' for {name} regarding their {category} spending.
            Context: They spent ₹{amount:,.0f} this week, which is {percentage_increase:.1f}% higher than normal.
            - Max 30 words. No quotes, no markdown.
            - Be cheeky. Example: 'Your coffee budget is starting to look like a down payment on a house, {name}. Maybe it's time to learn how a kettle works?'
            """
            resp = await self.llm.generate_response(prompt, temperature=0.8, timeout=8.0)
            if resp:
                roast_message = resp.strip()

        content = f"""
        <p>Hello {name},</p>
        <div style="background: #fff; border: 1px solid #fee2e2; padding: 25px; border-radius: 16px; margin: 25px 0;">
            <p style="margin: 0; font-size: 18px; color: #111; font-style: italic; line-height: 1.6;">"{roast_message}"</p>
        </div>
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 14px; color: #64748b;">This Week's {category}:</span>
            <span style="font-size: 20px; font-weight: 800; color: #ef4444;">₹{amount:,.0f}</span>
        </div>
        """
        html = self._get_html_wrapper(
            title="Spending Roast",
            content=content,
            cta_text="Review Transactions",
            cta_url=f"{settings.FRONTEND_ORIGIN}/analytics"
        )
        send_email(user.email, subject, html)

    async def send_buffer_alert(self, user_id: uuid.UUID, full_name: str, safe_to_spend: float):
        """Emergency alert when Safe-to-Spend drops into the danger zone."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.email: return

        name = self._derive_name(user.email, full_name)
        subject = "🚨 Red Alert: Buffer Exhausted"
        
        content = f"""
        <p>Hello {name}, your financial dashboard is flashing red.</p>
        <p style="font-size: 17px; color: #111; font-weight: 600;">Your Safe-to-Spend has dropped below your safety buffer.</p>
        
        <div style="background: #000; color: #fff; padding: 40px; border-radius: 24px; margin: 30px 0; text-align: center; border: 2px solid #ef4444; box-shadow: 0 0 30px rgba(239, 68, 68, 0.4);">
             <div style="width: 10px; height: 10px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 15px #ef4444; margin: 0 auto 15px auto; animation: pulse 2s infinite;"></div>
            <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8; margin-bottom: 8px;">DANGER ZONE BALANCE</span>
            <span style="font-size: 42px; font-weight: 900; color: #ef4444; letter-spacing: -0.05em;">₹{safe_to_spend:,.2f}</span>
        </div>
        
        <p style="color: #475569; font-size: 16px;">This means any further spending until your next income might cannibalize funds reserved for your upcoming bills. It's time for an elective spending freeze.</p>
        """
        html = self._get_html_wrapper(
            title="Financial Flare",
            content=content,
            cta_text="Check Damage",
            cta_url=f"{settings.FRONTEND_ORIGIN}/dashboard"
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
        
        if self.llm.is_enabled:
            prompt = f"""
            Persona: Sassy, witty, premium personal CFO. 
            Task: Write a funny, slightly flirty/teasing nudge for {name} who hasn't synced their bank in {days_inactive} days.
            - Tease them about their 'ghosting' skills or 'selective memory' regarding spending.
            - Max 30 words. 
            - No quotes, no markdown.
            Example: "Ghosting your finances doesn't make the bills go away, {name}. Reconnect before your budget has an identity crisis."
            """
            resp = await self.llm.generate_response(prompt, temperature=0.7, timeout=5.0)
            if resp:
                nudge_message = resp.strip().replace('"', '')

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

        if self.llm.is_enabled:
            context_str = f"Top Spend this week: {top_category}" if top_category else ""
            prompt = f"""
            Persona: Witty, premium, world-class lifestyle concierge.
            Context: User {name} has ₹{safe_to_spend:,.0f} safe to spend. {context_str}.
            
            Task: Write a highly personal, cheeky weekend recommendation. 
            - If {top_category} is 'Food': Tease their palate. 
            - If Budget > 3k: Suggest a 'treat yourself' moment.
            - If Budget < 3k and > 1k: Suggest something in the middle.
            - If Budget < 1k: Suggest something 'poor but gold' like a park sunset with stolen office coffee.
            - Mood: Sophisticated but funny. Use wordplay. 
            
            Return JSON only, NO markdown:
            {{ "headline": "Witty headline", "message": "The suggestion", "cta": "Cheeky CTA", "subject": "Bait-y subject line" }}
            """
            data = await self.llm.generate_json(prompt, temperature=0.8, timeout=8.0)
            if data:
                ai_headline = data.get("headline", ai_headline)
                ai_message = data.get("message", ai_message)
                ai_cta = data.get("cta", ai_cta)
                subject = data.get("subject", subject)

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

    async def send_monthly_report(self, user_id: uuid.UUID, full_name: str, summary: any, variance: any):
        """Send a massive monthly intelligence report with AI recommendations and data breakdown."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.email: return

        name = self._derive_name(user.email, full_name)
        subject = f"Monthly Intelligence: Your {summary.month} Review"
        
        # 1. Prepare visual breakdown (Top 5 categories)
        sorted_cats = sorted(variance.category_breakdown.items(), key=lambda x: x[1].current, reverse=True)[:5]
        breakdown_html = ""
        for cat, data in sorted_cats:
            percentage = (float(data.current) / float(summary.total_expense) * 100) if summary.total_expense > 0 else 0
            breakdown_html += f"""
            <div style="margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px;">
                    <span style="color: #475569; font-weight: 600;">{cat}</span>
                    <span style="color: #111; font-weight: 800;">₹{data.current:,.0f}</span>
                </div>
                <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden;">
                    <div style="width: {min(100, percentage)}%; height: 100%; background: #4F46E5; box-shadow: 0 0 10px rgba(79, 70, 229, 0.4);"></div>
                </div>
            </div>
            """

        # 2. Get AI Strategic Nudge
        ai_strategy = "Great work tracking your finances this month. Keep it up for a stronger next month!"
        if self.llm.is_enabled:
            top_cats_str = ", ".join([f"{c}: ₹{d.current:,.0f}" for c, d in sorted_cats])
            prompt = f"""
            Persona: Sassy but brilliant luxury wealth manager.
            User: {name}
            Month: {summary.month}
            Total Income: ₹{summary.total_income:,.0f}, Expenses: ₹{summary.total_expense:,.0f}
            Top Spends: {top_cats_str}
            
            Task: Write a 2-3 sentence 'Optimization Strategy'. 
            - Be blunt but funny. 
            - If expenses > income, send a 'brutal' reality check. 
            - If income > expenses, celebrate the win but suggest an 'aggressive' investment move.
            - Max 40 words. No markdown.
            """
            resp = await self.llm.generate_response(prompt, temperature=0.8, timeout=10.0)
            if resp:
                ai_strategy = resp.strip()

        content = f"""
        <p>Hello {name}, your financial dossier for <strong>{summary.month}</strong> is ready.</p>
        
        <!-- Summary Cards -->
        <div style="display: flex; gap: 15px; margin: 30px 0;">
            <div style="flex: 1; background: #f8fafc; padding: 25px; border-radius: 20px; border: 1px solid #e2e8f0; text-align: center;">
                <span style="display: block; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em; margin-bottom: 8px; font-weight: 700;">Income</span>
                <span style="font-size: 24px; font-weight: 900; color: #10b981;">₹{summary.total_income:,.0f}</span>
            </div>
            <div style="flex: 1; background: #f8fafc; padding: 25px; border-radius: 20px; border: 1px solid #e2e8f0; text-align: center;">
                <span style="display: block; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em; margin-bottom: 8px; font-weight: 700;">Expenses</span>
                <span style="font-size: 24px; font-weight: 900; color: #ef4444;">₹{summary.total_expense:,.0f}</span>
            </div>
        </div>

        <!-- Strategy Box -->
        <div style="background: #000; color: white; padding: 35px; border-radius: 24px; margin: 30px 0; border: 1px solid rgba(79, 70, 229, 0.4); box-shadow: 0 20px 50px -10px rgba(0,0,0,0.3);">
            <div style="width: 8px; height: 8px; background: #4F46E5; border-radius: 50%; box-shadow: 0 0 10px #4F46E5; margin-bottom: 15px;"></div>
            <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8; font-weight: 700; border-bottom: 1px solid #333; padding-bottom: 12px; margin-bottom: 20px;">AI Wealth Strategy</p>
            <p style="margin: 0; font-size: 17px; font-style: italic; color: #fff; line-height: 1.6;">"{ai_strategy}"</p>
        </div>

        <!-- Visual Breakdown -->
        <div style="margin-top: 40px;">
            <h3 style="color: #111; font-size: 20px; font-weight: 800; margin-bottom: 20px; letter-spacing: -0.02em;">Category Intelligence</h3>
            <div style="background: white; border: 1px solid #f1f5f9; padding: 30px; border-radius: 24px;">
                {breakdown_html}
            </div>
        </div>
        """
        html = self._get_html_wrapper(
            title=f"{summary.month} Dossier",
            content=content,
            cta_text="Check Full Analytics",
            cta_url=f"{settings.FRONTEND_ORIGIN}/analytics",
            footer_note="Based on consolidated data from your synchronized bank accounts and manual entries."
        )
        send_email(user.email, subject, html)
