from uuid import UUID
from typing import List, Optional, Dict
from datetime import datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from fastapi import HTTPException, Depends
from app.features.settle_up.models import SettleUpEntry, SettleUpPeerContact
from app.features.settle_up import schemas
from app.features.auth.models import User
from app.core.database import get_db
from app.core.email import send_email

class SettleUpService:
    def __init__(self, db: AsyncSession = Depends(get_db)):
        self.db = db

    async def get_peer_balances(self, user_id: UUID, include_settled: bool = True) -> List[schemas.PeerBalance]:
        """
        Gets a summary of all peers and the net balance owed.
        Positive: They owe you. Negative: You owe them.
        If include_settled is False, filters out peers whose net balance is 0.
        Attaches saved contact info (phone/WhatsApp, email, auto-remind settings).
        """
        # Fetch peer contacts map
        contacts_stmt = select(SettleUpPeerContact).where(SettleUpPeerContact.user_id == user_id)
        contacts_res = await self.db.execute(contacts_stmt)
        contacts_map = {c.peer_name.strip().lower(): c for c in contacts_res.scalars().all()}

        stmt = (
            select(
                func.max(SettleUpEntry.peer_name).label("peer_name"),
                func.sum(SettleUpEntry.amount).label("net_balance"),
                func.max(SettleUpEntry.date).label("last_activity_date")
            )
            .where(SettleUpEntry.user_id == user_id)
            .group_by(func.lower(SettleUpEntry.peer_name))
        )
        if not include_settled:
            stmt = stmt.having(func.sum(SettleUpEntry.amount) != 0)

        stmt = stmt.order_by(desc("last_activity_date"))
        result = await self.db.execute(stmt)
        
        balances = []
        for row in result:
            p_name = row.peer_name or ""
            contact = contacts_map.get(p_name.strip().lower())
            balances.append(
                schemas.PeerBalance(
                    peer_name=p_name,
                    net_balance=row.net_balance or Decimal("0"),
                    last_activity_date=row.last_activity_date,
                    phone=contact.phone if contact else None,
                    email=contact.email if contact else None,
                    auto_remind_email=contact.auto_remind_email if contact else False,
                    last_reminded_at=contact.last_reminded_at if contact else None,
                )
            )
        return balances

    async def get_peer_history(self, user_id: UUID, peer_name: str, limit: int = 50) -> List[SettleUpEntry]:
        """Gets the transaction history for a specific peer."""
        peer_name_stripped = peer_name.strip()
        stmt = (
            select(SettleUpEntry)
            .where(SettleUpEntry.user_id == user_id)
            .where(SettleUpEntry.peer_name.ilike(peer_name_stripped))
            .order_by(SettleUpEntry.date.desc(), SettleUpEntry.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_peer_contact(self, user_id: UUID, peer_name: str) -> Optional[SettleUpPeerContact]:
        """Gets the contact details (WhatsApp, Email) for a specific peer."""
        stmt = select(SettleUpPeerContact).where(
            SettleUpPeerContact.user_id == user_id,
            func.lower(SettleUpPeerContact.peer_name) == func.lower(peer_name.strip())
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_contacts(self, user_id: UUID) -> List[SettleUpPeerContact]:
        """Gets all peer contacts for a user."""
        stmt = select(SettleUpPeerContact).where(SettleUpPeerContact.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def upsert_peer_contact(self, user_id: UUID, peer_name: str, data: schemas.PeerContactUpdate) -> SettleUpPeerContact:
        """Creates or updates contact details (WhatsApp number, Email, auto-remind) for a peer."""
        contact = await self.get_peer_contact(user_id, peer_name)
        if not contact:
            contact = SettleUpPeerContact(
                user_id=user_id,
                peer_name=peer_name.strip(),
                phone=data.phone.strip() if data.phone else None,
                email=data.email.strip() if data.email else None,
                auto_remind_email=data.auto_remind_email if data.auto_remind_email is not None else False
            )
            self.db.add(contact)
        else:
            if data.phone is not None:
                contact.phone = data.phone.strip() if data.phone else None
            if data.email is not None:
                contact.email = data.email.strip() if data.email else None
            if data.auto_remind_email is not None:
                contact.auto_remind_email = data.auto_remind_email

        await self.db.commit()
        await self.db.refresh(contact)
        return contact

    async def add_ledger_entry(self, user_id: UUID, data: schemas.SettleUpEntryCreate) -> SettleUpEntry:
        """Adds a ledger entry and optionally updates peer contact info (WhatsApp/email)."""
        entry_data = data.model_dump(exclude={'phone', 'email'})
        entry_data["user_id"] = user_id
        
        if not entry_data.get("date"):
            from datetime import date
            entry_data["date"] = date.today()

        entry = SettleUpEntry(**entry_data)
        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)

        # Update contact info if provided
        if data.phone or data.email:
            await self.upsert_peer_contact(
                user_id,
                data.peer_name,
                schemas.PeerContactUpdate(phone=data.phone, email=data.email)
            )

        return entry

    async def update_settle_up_entry(self, user_id: UUID, entry_id: UUID, data: schemas.SettleUpEntryUpdate) -> SettleUpEntry:
        """Updates an existing settle-up entry."""
        stmt = select(SettleUpEntry).where(SettleUpEntry.id == entry_id, SettleUpEntry.user_id == user_id)
        result = await self.db.execute(stmt)
        entry = result.scalar_one_or_none()
        
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(entry, field, value)

        await self.db.commit()
        await self.db.refresh(entry)
        return entry

    async def delete_settle_up_entry(self, user_id: UUID, entry_id: UUID) -> bool:
        """Deletes a settle-up entry."""
        stmt = select(SettleUpEntry).where(SettleUpEntry.id == entry_id, SettleUpEntry.user_id == user_id)
        result = await self.db.execute(stmt)
        entry = result.scalar_one_or_none()
        
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")

        await self.db.delete(entry)
        await self.db.commit()
        return True

    async def send_email_reminder(
        self,
        user_id: UUID,
        peer_name: str,
        custom_note: Optional[str] = None,
        subject: Optional[str] = None,
        include_ledger: bool = True
    ) -> schemas.SendEmailReminderResponse:
        """
        Sends a polite, friendly literary reminder email to the borrower regarding their pending balance.
        """
        user = await self.db.get(User, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # Get net balance
        stmt = (
            select(func.sum(SettleUpEntry.amount))
            .where(
                SettleUpEntry.user_id == user_id,
                SettleUpEntry.peer_name.ilike(peer_name.strip())
            )
        )
        net_balance = (await self.db.execute(stmt)).scalar_one_or_none() or Decimal("0")
        if net_balance <= Decimal("0"):
            raise HTTPException(status_code=400, detail="Cannot send reminder: No outstanding positive balance owed by this contact.")

        contact = await self.get_peer_contact(user_id, peer_name)
        if not contact or not contact.email:
            raise HTTPException(status_code=400, detail="No email address saved for this borrower. Please save their email first.")

        # Query all ledger entries for this peer
        entries = []
        if include_ledger:
            entries_stmt = (
                select(SettleUpEntry)
                .where(
                    SettleUpEntry.user_id == user_id,
                    SettleUpEntry.peer_name.ilike(peer_name.strip())
                )
                .order_by(SettleUpEntry.date.asc(), SettleUpEntry.created_at.asc())
            )
            entries = (await self.db.execute(entries_stmt)).scalars().all()

        user_display_name = user.full_name or user.email.split('@')[0]
        formatted_amount = f"₹{float(net_balance):,.2f}".rstrip('0').rstrip('.') if float(net_balance) % 1 == 0 else f"₹{float(net_balance):,.2f}"

        email_subject = subject or f"Friendly note from {user_display_name} regarding our pending balance ({formatted_amount})"

        # HTML Body
        custom_note_block = f"""
            <div style="background: #f8fafc; border-left: 3px solid #10b981; padding: 12px 16px; margin: 16px 0; border-radius: 4px; font-style: italic; color: #334155;">
                &ldquo;{custom_note}&rdquo;
            </div>
        """ if custom_note else ""

        # Ledger breakdown block
        ledger_table_block = ""
        if include_ledger and entries:
            rows_html = ""
            for e in entries:
                is_lent = e.amount >= 0
                direction_label = "Lent / Paid" if is_lent else "Repaid / Received"
                amt_color = "#15803d" if is_lent else "#b91c1c"
                amt_sign = "+" if is_lent else "-"
                date_str = e.date.strftime("%d %b %Y") if e.date else "—"
                note_str = e.remarks or "—"
                rows_html += f"""
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 9px 12px; color: #64748b; font-size: 11px; white-space: nowrap;">{date_str}</td>
                    <td style="padding: 9px 12px; color: #1e293b; font-size: 11px;">{note_str}</td>
                    <td style="padding: 9px 12px; color: #64748b; font-size: 10px; text-transform: uppercase;">{direction_label}</td>
                    <td style="padding: 9px 12px; text-align: right; font-weight: 700; color: {amt_color}; font-size: 11px; white-space: nowrap;">{amt_sign}₹{abs(float(e.amount)):,.2f}</td>
                </tr>
                """
            ledger_table_block = f"""
            <div style="margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
                <div style="background: #f8fafc; padding: 10px 14px; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0;">
                    Itemized Transaction Ledger ({len(entries)} items)
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                    <thead>
                        <tr style="background: #f1f5f9; color: #64748b; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px;">
                            <th style="padding: 8px 12px; text-align: left;">Date</th>
                            <th style="padding: 8px 12px; text-align: left;">Note / Purpose</th>
                            <th style="padding: 8px 12px; text-align: left;">Type</th>
                            <th style="padding: 8px 12px; text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows_html}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid #e2e8f0;">
                            <td colspan="3" style="padding: 10px 12px; text-transform: uppercase; font-size: 10px; color: #1e293b;">Net Pending Balance</td>
                            <td style="padding: 10px 12px; text-align: right; color: #15803d; font-size: 12px;">{formatted_amount}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            """

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 24px; }}
            .card {{ background: #ffffff; max-width: 540px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0; }}
            .header {{ background: #0f172a; padding: 24px 32px; text-align: center; color: #ffffff; }}
            .header h1 {{ margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; font-style: italic; }}
            .header p {{ margin: 4px 0 0; font-size: 11px; opacity: 0.7; letter-spacing: 2px; text-transform: uppercase; font-weight: 600; }}
            .content {{ padding: 32px; }}
            .amount-box {{ background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }}
            .amount {{ font-size: 32px; font-weight: 900; color: #16a34a; font-family: monospace; margin: 4px 0; }}
            .literary-quote {{ background: #fafafa; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; font-size: 12px; color: #64748b; text-align: center; font-style: italic; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 18px 24px; font-size: 11px; color: #475569; border-top: 1px solid #e2e8f0; background: #f8fafc; font-weight: 500; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>GRIP</h1>
              <p>Settlement &amp; Shared Ledger</p>
            </div>
            <div class="content">
              <p style="font-size: 15px; margin-top: 0;">Hi <strong>{peer_name}</strong>,</p>
              <p style="font-size: 13.5px; line-height: 1.6; color: #334155;">
                Hope you're having a wonderful week! <strong>{user_display_name}</strong> wanted to share a gentle, friendly note regarding our pending shared expenses.
              </p>

              <div class="amount-box">
                <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #15803d;">Current Outstanding Balance</span>
                <div class="amount">{formatted_amount}</div>
                <span style="font-size: 11px; color: #64748b;">Pending settlement</span>
              </div>

              {custom_note_block}
              {ledger_table_block}

              <div class="literary-quote">
                &ldquo;Neither a borrower nor a lender be, so goes the adage &mdash; but between good friends, memories (and tidy ledgers) make the sweetest company.&rdquo;
              </div>

              <p style="font-size: 13px; line-height: 1.6; color: #475569;">
                Whenever you get a quiet moment, feel free to square this up via UPI, GPay, or your preferred payment app. No urgent rush at all &mdash; just keeping our shared records clean and up to date!
              </p>

              <p style="font-size: 13px; margin-bottom: 0; color: #334155;">
                Warm regards,<br>
                <strong>{user_display_name}</strong>
              </p>
            </div>
            <div class="footer">
              Automated email from Grip ({user_display_name}'s finance manager) &bull; Shared expense tracking
            </div>
          </div>
        </body>
        </html>
        """

        sent = send_email(
            to_email=contact.email,
            subject=email_subject,
            html_content=html_body
        )

        if not sent:
            raise HTTPException(status_code=500, detail="Failed to send email. Please verify SMTP/Relay configuration.")

        contact.last_reminded_at = datetime.now()
        await self.db.commit()

        return schemas.SendEmailReminderResponse(
            status="success",
            message=f"Reminder email successfully sent to {contact.email}",
            sent_to=contact.email,
            reminded_at=contact.last_reminded_at
        )
