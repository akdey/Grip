import asyncio
import hashlib
import re
import uuid
import logging
import json
import base64
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Union
from sqlalchemy import select, desc, delete, or_, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
import time

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest

from app.core.database import get_db
from app.core.config import get_settings
from app.features.transactions.service import TransactionService
from app.features.sanitizer.service import get_sanitizer_service
from app.features.transactions.models import TransactionStatus
from app.features.sync.models import SyncLog
from app.features.auth.models import User
from app.features.categories.models import SubCategory
from app.features.categories.service import CategoryService
from app.features.wealth.service import WealthService
from app.features.notifications.service import NotificationService
from app.core.llm import get_llm_service, LLMService

settings = get_settings()
logger = logging.getLogger(__name__)



class SyncService:
    # Class-level tracker for active sync tasks per user (debouncing and running)
    _active_syncs = set()
    _trends_cache = {} # user_id -> (timestamp, data)
    TRENDS_CACHE_TTL = 600 # 10 minutes
    _last_watch_renewal = {} # user_id -> timestamp (throttles renew_watch to once per 24h)

    def __init__(self,                  db: AsyncSession = Depends(get_db), 
                 transaction_service: TransactionService = Depends(),
                 category_service: CategoryService = Depends(),
                 wealth_service: WealthService = Depends(),
                 notification_service: NotificationService = Depends(),
                 llm: LLMService = Depends(get_llm_service)):
        self.db = db
        self.txn_service = transaction_service
        self.category_service = category_service
        self.wealth_service = wealth_service
        self.notification_service = notification_service
        self.llm = llm
        self.sanitizer = get_sanitizer_service()

    async def _get_last_sync_time(self, user_id: uuid.UUID) -> Optional[datetime]:
        # Only use timestamp from syncs that actually processed records.
        # This prevents empty syncs (e.g. after reconnect) from pushing
        # the 'after:' window forward and missing all historical emails.
        stmt = (
            select(SyncLog)
            .where(SyncLog.user_id == user_id)
            .where(SyncLog.status == "SUCCESS")
            .where(SyncLog.records_processed > 0)
            .order_by(desc(SyncLog.start_time))
            .limit(1)
        )
        result = await self.db.execute(stmt)
        log = result.scalar_one_or_none()
        if not log:
            return None
            
        # Subtract 1 hour to have a small overlap and prevent boundary misses
        return log.start_time - timedelta(hours=1)

    async def _log_start(self, user_id: uuid.UUID, source: str) -> SyncLog:
        log = SyncLog(user_id=user_id, trigger_source=source, status="IN_PROGRESS")
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        return log

    async def _log_end(self, log: SyncLog, status: str, count: int = 0, error: str = None, summary: Union[dict, list] = None):
        log.end_time = datetime.now()
        log.status = status
        log.records_processed = count
        log.error_message = error[:500] if error else None
        
        if summary is not None:
            log.summary = json.dumps(summary)
        else:
            log.summary = None
        await self.db.commit()

    async def prune_sync_logs(self, keep_days: int = 30, keep_empty_days: int = 3, user_id: Optional[uuid.UUID] = None) -> int:
        """
        Purges old sync logs to keep the database footprint minimal.
        - Logs with 0 or NULL records processed (or failed/stale) are purged after `keep_empty_days` (default 3 days).
        - All other logs older than `keep_days` (default 30 days) are purged.
        - Always preserves each user's latest successful sync log so `last_sync` is never lost.
        """
        now = datetime.now(timezone.utc)
        cutoff_all = now - timedelta(days=keep_days)
        cutoff_empty = now - timedelta(days=keep_empty_days)

        empty_condition = and_(
            or_(
                SyncLog.records_processed == 0,
                SyncLog.records_processed.is_(None),
                SyncLog.status.in_(["FAILED", "IN_PROGRESS"])
            ),
            SyncLog.start_time < cutoff_empty
        )

        conditions = [
            or_(
                SyncLog.start_time < cutoff_all,
                empty_condition
            )
        ]

        if user_id:
            conditions.append(SyncLog.user_id == user_id)

        # Protect each user's latest successful sync log so last_sync is never lost
        latest_success_subq = (
            select(func.max(SyncLog.id))
            .where(SyncLog.status == "SUCCESS")
        )
        if user_id:
            latest_success_subq = latest_success_subq.where(SyncLog.user_id == user_id)
        else:
            latest_success_subq = latest_success_subq.group_by(SyncLog.user_id)

        latest_ids_res = await self.db.execute(latest_success_subq)
        protected_ids = set(latest_ids_res.scalars().all())

        if protected_ids:
            conditions.append(SyncLog.id.notin_(protected_ids))

        stmt = delete(SyncLog).where(and_(*conditions))
        result = await self.db.execute(stmt)
        await self.db.commit()
        return result.rowcount

    def _clean_email_body(self, text: str) -> str:
        """Normalizes excessive whitespace without stripping critical context."""
        if not text:
            return ""
        text = re.sub(r'[\r\n]{3,}', '\n\n', text)
        text = re.sub(r'[ \t]{2,}', ' ', text)
        return text.strip()

    def _extract_email_body(self, payload: dict) -> str:
        """Recursively extract text/plain or text/html body from message payload."""
        mime_type = payload.get('mimeType', '')
        
        # Base cases
        if mime_type == 'text/plain':
            data = payload.get('body', {}).get('data')
            if data:
                return base64.urlsafe_b64decode(data).decode()
        elif mime_type == 'text/html':
            data = payload.get('body', {}).get('data')
            if data:
                html_body = base64.urlsafe_b64decode(data).decode()
                # Strip HTML tags
                import html
                text = re.sub(r'<[^>]+>', ' ', html_body)
                return html.unescape(text)
                
        # Recursive cases for multiparts
        parts = payload.get('parts', [])
        # Prefer text/plain first
        for part in parts:
            if part.get('mimeType') == 'text/plain':
                body = self._extract_email_body(part)
                if body:
                    return body
                    
        # Fallback to other parts (like nested multiparts or text/html)
        for part in parts:
            if part.get('mimeType') != 'text/plain':
                body = self._extract_email_body(part)
                if body:
                    return body
                    
        # Check outer body for non-multipart emails
        data = payload.get('body', {}).get('data')
        if data:
            return base64.urlsafe_b64decode(data).decode()
            
        return ""

    async def call_brain_api(
        self,
        text: str,
        user_id: uuid.UUID,
        categories_context: List[str] = None,
        subject: str = "",
        sender: str = ""
    ) -> dict:
        """
        Unified LLM-based Transaction Identification & Extraction.
        Accuracy over Latency.
        """
        # Compacting Category Context for token efficiency
        cat_str = "Categories: Food, Transport, Shopping, Housing, Bills & Utilities, Investment, Income, Entertainment, Medical, Personal Care"
        if categories_context:
            cat_str = "Available Categories and Sub-categories:\n" + "\n".join([f"- {c}" for c in categories_context]) #[:30]

        # Clean whitespace without stripping meaningful sentences or context
        cleaned_text = self._clean_email_body(text)
        
        prompt = f"""
        You are a high-precision financial intelligence engine. 
        TASK: Determine if an actual financial transaction took place and extract its details.

        CRITICAL EVALUATION RULE:
        - Set "is_transaction" to TRUE ONLY if real money was successfully debited, credited, spent, or transferred, changing an account balance.
        - Set "is_transaction" to FALSE for:
          * Login alerts, login attempts, or failed access notifications (e.g. "Your attempt to log into Mobile Banking App could not be processed")
          * Mutual fund NAV notifications, unit allotments, or portfolio valuation statements
          * Promotional offers, discounts, or pre-approved loans (e.g. "Get 10% off at Croma", "Pre-approved loan")
          * One-Time Passwords (OTPs) or 2FA verification codes
          * Payment reminders, bills due alerts, or minimum amount due notices (where no money was paid yet)
          * Declined or failed transactions

        EXTRACTION FIELDS:
        1. is_transaction: (boolean) True only if real money moved. Otherwise false.
        2. amount: (float) The exact value transferred. Set to 0.0 if is_transaction is false.
        3. merchant_name: (string) The brand, person, or clearing descriptor paid to.
           - Rule: NEVER use a bank name (HDFC, ICICI, SBI, Axis) as the merchant.
           - Clean reference numbers and UPI handles from the name.
           - Set to "NONE" if is_transaction is false.
        4. category/sub_category: Matched from available categories below, or "Uncategorized".
        5. account_type: "SAVINGS", "CREDIT_CARD", or "CASH".
        6. transaction_type: "DEBIT" or "CREDIT".
        7. extracted_date: ISO format (YYYY-MM-DD), or null.
        8. reason: (string) Short 3-6 word summary (e.g. "Card spend at Starbucks", "Security login alert", "Mutual fund NAV update", "Promotional offer", "OTP verification code").

        FEW-SHOT EXAMPLES:
        Example 1: "Spent Rs. 450 at Starbucks on HDFC Card ending 1234 on 12-Nov-2026"
        -> {{"is_transaction": true, "amount": 450.0, "currency": "INR", "merchant_name": "Starbucks", "category": "Food", "sub_category": "Restaurants", "account_type": "CREDIT_CARD", "transaction_type": "DEBIT", "extracted_date": "2026-11-12", "reason": "Card spend at Starbucks"}}

        Example 2: "Your attempt to log into Mobile Banking App, open could not be processed"
        -> {{"is_transaction": false, "amount": 0.0, "currency": "INR", "merchant_name": "NONE", "category": "Uncategorized", "sub_category": "Uncategorized", "account_type": "SAVINGS", "transaction_type": "DEBIT", "extracted_date": null, "reason": "Security login alert"}}

        Example 3: "NAV of ICICI Prudential Bluechip Fund as on 10-Nov-2026 is 89.42"
        -> {{"is_transaction": false, "amount": 0.0, "currency": "INR", "merchant_name": "NONE", "category": "Uncategorized", "sub_category": "Uncategorized", "account_type": "SAVINGS", "transaction_type": "DEBIT", "extracted_date": null, "reason": "Mutual fund NAV update"}}

        Example 4: "Special offer: Apply now and get Rs. 1000 cashback on your new card"
        -> {{"is_transaction": false, "amount": 0.0, "currency": "INR", "merchant_name": "NONE", "category": "Uncategorized", "sub_category": "Uncategorized", "account_type": "CREDIT_CARD", "transaction_type": "DEBIT", "extracted_date": null, "reason": "Promotional cashback offer"}}

        Example 5: "OTP for transaction of Rs 500 at Amazon is 123456"
        -> {{"is_transaction": false, "amount": 0.0, "currency": "INR", "merchant_name": "NONE", "category": "Uncategorized", "sub_category": "Uncategorized", "account_type": "SAVINGS", "transaction_type": "DEBIT", "extracted_date": null, "reason": "OTP verification code"}}

        {cat_str}

        NOTIFICATION CONTENT:
        SUBJECT: {subject}
        SENDER: {sender}
        BODY:
        \"\"\"{cleaned_text[:4000]}\"\"\"

        RETURN ONLY RAW JSON:
        {{
          "is_transaction": <bool>,
          "amount": <float: exact value transferred, or 0.0>,
          "currency": "INR",
          "merchant_name": "<string: name of merchant, or NONE>",
          "category": "<string: category name>",
          "sub_category": "<string: sub-category name>",
          "account_type": "<SAVINGS or CREDIT_CARD>",
          "transaction_type": "<DEBIT or CREDIT>",
          "extracted_date": "<YYYY-MM-DD or null>",
          "reason": "<string: short 3-6 word summary>"
        }}
        """
        # Step 1: Query Local LLM (Gemma 4)
        logger.info(f"🔍 [Brain:{str(user_id)[:8]}] Analyzing incoming message via LLM...")
        data = await self.llm.generate_json(prompt, temperature=0.1)
        
        # Retry ONLY if LLM returned null/invalid JSON (crash or timeout), never if it made an intentional decision
        if data is None:
            logger.warning(f"⚠️ [Brain:{str(user_id)[:8]}] LLM response was null/invalid JSON. Retrying (temp=0.3)...")
            data = await self.llm.generate_json(prompt, temperature=0.3)

        # Step 2: Handle intentional non-transaction classification
        if data and not data.get("is_transaction"):
            logger.info(f"🛑 [Brain:{str(user_id)[:8]}] Verdict: NON-TRANSACTION | Skipped.")
            return {
                "amount": 0.0,
                "currency": "INR",
                "merchant_name": "NON_TRANSACTION",
                "category": "Uncategorized",
                "sub_category": "Uncategorized",
                "account_type": "SAVINGS",
                "transaction_type": "DEBIT",
                "extracted_date": None,
                "is_transaction": False,
                "reason": data.get("reason") or "Classified as non-financial notification (no balance change)",
                "extractor": "🤖 Gemma"
            }

        # Step 3: Handle verified transaction
        if data and data.get("is_transaction"):
            merchant = (data.get("merchant_name") or data.get("merchant") or "UNKNOWN").strip()
            amount = float(data.get("amount") or 0.0)
            if abs(amount) > 0 and merchant.upper() != "NONE":
                acc_type = data.get("account_type", "SAVINGS")
                txn_type = data.get("transaction_type", "DEBIT")
                cat = data.get("category", "Uncategorized")
                logger.info(
                    f"✅ [Brain:{str(user_id)[:8]}] Verdict: TRANSACTION ({txn_type}) | "
                    f"Category: {cat} | Account: {acc_type}"
                )
                return {
                    "amount": amount,
                    "currency": data.get("currency") or "INR",
                    "merchant_name": merchant.title(),
                    "category": cat,
                    "sub_category": data.get("sub_category") or "Uncategorized",
                    "account_type": acc_type,
                    "transaction_type": txn_type,
                    "extracted_date": data.get("extracted_date"),
                    "is_transaction": True,
                    "reason": data.get("reason") or f"Real money {txn_type.lower()} transfer",
                    "extractor": "🤖 Gemma"
                }

        # Step 4: Regex Fallback - ONLY if LLM crashed/timed out completely (data is None)
        if data is None:
            logger.warning(f"⚠️ [Brain:{str(user_id)[:8]}] LLM failed completely. Falling back to Regex parser.")
            return self._regex_fallback_txn(text, user_id)

        # Default fallback for unparseable output
        return self._fallback_txn()

    def _regex_fallback_txn(self, text: str, user_id: uuid.UUID) -> dict:
        import re
        amount = 0.0
        merchant = "UNKNOWN"
        txn_type = "DEBIT" # Most notifications are debits
        
        # 1. Search for amount
        amount_match = re.search(r'(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)', text, re.IGNORECASE)
        if amount_match:
            try:
                base_val = amount_match.group(1).replace(',', '')
                amount = float(base_val)
            except ValueError:
                pass

        if amount > 0:
             # Basic keyword checking for credit
             if re.search(r'\b(?:credited|received|deposit)\b', text, re.IGNORECASE):
                 txn_type = "CREDIT"
             
             # 2. Search for UPI patterns for the merchant
             # Format A: Business/UPI ID (user@bank)
             upi_id_match = re.search(r'\b([a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,})\b', text)
             
             # Format B: UPI Transaction Path (UPI/P2P/something/Merchant/...)
             upi_path_match = re.search(r'UPI/(?:P2P|P2M)/[^/\r\n]+/([^/\r\n]+?)(?:/|\r|\n|$)', text, re.IGNORECASE)
             
             # Format C: General "by/at/to/towards/from" patterns
             # Find all occurrences to handle cases where "by" or "to" appears multiple times
             all_general = re.findall(r'\b(?:at|by|to|towards|from)\s+([A-Z0-9\s.\-]{3,100})(?:\s+on|\s+at|\s+using|\s+for|\.|\r|\n|$)', text, re.IGNORECASE)

             if upi_path_match:
                 merchant = upi_path_match.group(1).strip().title()
             elif upi_id_match:
                 merchant = upi_id_match.group(1).title()
             elif all_general:
                 # all_general might have multiple matches, we take the first one
                 # Exclude common false positives like "Axis Bank" or "HDFC"
                 for match in all_general:
                     candidate = match.strip().title()
                     if "Bank" not in candidate and candidate.upper() not in ["HDFC", "ICICI", "SBI"]:
                         merchant = candidate
                         break
                 
             logger.info(f"[Brain:{str(user_id)[:8]}] Regex Fallback matched transaction ({txn_type})")

        return {
            "amount": amount,
            "currency": "INR",
            "merchant_name": merchant if amount > 0 else "UNCATEGORIZED",
            "category": "Uncategorized",
            "sub_category": "Uncategorized",
            "account_type": "SAVINGS",
            "transaction_type": txn_type,
            "is_transaction": amount > 0,
            "reason": f"Regex parsed {txn_type.lower()}" if amount > 0 else "Regex did not find amount",
            "extractor": "🔍 R"
        }

    def _fallback_txn(self) -> dict:
        return {
            "amount": 0.0,
            "currency": "INR",
            "merchant_name": "UNCATEGORIZED",
            "category": "Uncategorized",
            "sub_category": "Uncategorized",
            "account_type": "SAVINGS",
            "transaction_type": "DEBIT",
            "is_transaction": False,
            "reason": "Unrecognized notification format"
        }

    async def fetch_gmail_changes(self, user_id: uuid.UUID, start_time: datetime = None) -> List[dict]:
        """Fetch banking emails from Gmail."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user or not user.gmail_credentials:
            logger.warning(f"[Sync:{user_id}] No user or no gmail_credentials found. Aborting fetch.")
            return []

        try:
            creds_data = user.gmail_credentials
            
            # Parse stored expiry so Credentials knows when the token expires
            expiry = None
            expiry_raw = creds_data.get('expiry')
            if expiry_raw:
                try:
                    expiry = datetime.fromisoformat(expiry_raw)
                except (ValueError, TypeError):
                    logger.warning(f"[Sync:{user_id}] Could not parse stored token expiry, will rely on 401 auto-refresh.")

            has_refresh = bool(creds_data.get('refresh_token'))
            logger.info(f"[Sync:{user_id}] Building credentials. has_refresh_token={has_refresh}, has_expiry={expiry is not None}")

            creds = Credentials(
                token=creds_data.get('token'),
                refresh_token=creds_data.get('refresh_token'),
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET,
                scopes=["https://www.googleapis.com/auth/gmail.readonly"],
                expiry=expiry
            )

            # Proactive refresh if token is expired or about to expire
            if creds.expired and creds.refresh_token:
                logger.info(f"[Sync:{user_id}] Token expired, attempting proactive refresh.")
                try:
                    creds.refresh(GoogleRequest())
                    user.gmail_credentials = {
                        "token": creds.token,
                        "refresh_token": creds.refresh_token,
                        "expiry": creds.expiry.isoformat() if creds.expiry else None
                    }
                    await self.db.commit()
                    logger.info(f"[Sync:{user_id}] Token refreshed and saved successfully.")
                except Exception as refresh_ex:
                    logger.error(f"[Sync:{user_id}] Token refresh FAILED: {type(refresh_ex).__name__}: {refresh_ex}")
                    user.gmail_credentials = None
                    await self.db.commit()
                    raise Exception("GMAIL_DISCONNECTED")
            elif not creds.refresh_token:
                logger.warning(f"[Sync:{user_id}] No refresh_token available. If access token is stale, sync will fail.")

            service = build('gmail', 'v1', credentials=creds)
            # Targeted keywords to catch banking and payment notifications while preserving privacy
            query = 'debit OR debited OR credit OR credited OR alert OR spent OR transaction OR transferred OR paid OR "payment of" OR "payment received" OR UPI OR refund'
            if start_time:
                query += f" after:{int(start_time.timestamp())}"
            
            logger.info(f"[Sync:{str(user_id)[:8]}] Gmail query: after={start_time.isoformat() if start_time else 'None'}")
            
            results = service.users().messages().list(userId='me', q=query, maxResults=50, includeSpamTrash=True).execute()
            messages = results.get('messages', [])
            
            logger.info(f"[Sync:{str(user_id)[:8]}] Gmail returned {len(messages)} message(s) matching query.")

            # After API call, persist any auto-refreshed token back to DB
            if creds.token != creds_data.get('token'):
                logger.info(f"[Sync:{str(user_id)[:8]}] Token was auto-refreshed during API call. Saving new token.")
                user.gmail_credentials = {
                    "token": creds.token,
                    "refresh_token": creds.refresh_token,
                    "expiry": creds.expiry.isoformat() if creds.expiry else None
                }
                await self.db.commit()

            detailed_messages = []
            body_extract_failures = 0
            for msg_meta in messages:
                msg = service.users().messages().get(userId='me', id=msg_meta['id']).execute()
                
                body = self._extract_email_body(msg.get('payload', {}))

                if not body:
                    body_extract_failures += 1

                # Extract Subject and From headers
                headers = msg.get('payload', {}).get('headers', [])
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), "No Subject")
                sender = next((h['value'] for h in headers if h['name'] == 'From'), "")

                detailed_messages.append({
                    "id": msg['id'],
                    "internalDate": msg['internalDate'],
                    "snippet": msg['snippet'],
                    "subject": subject,
                    "sender": sender,
                    "body": body
                })
            
            if body_extract_failures > 0:
                logger.warning(f"[Sync:{user_id}] Could not extract body from {body_extract_failures}/{len(messages)} message(s). Will fall back to snippet.")
            
            return detailed_messages

        except Exception as e:
            error_type = type(e).__name__
            logger.error(f"[Sync:{user_id}] Gmail fetch FAILED: {error_type}: {e}")
            # Propagate credential failures so they're visible in sync history
            if "GMAIL_DISCONNECTED" in str(e) or "invalid_grant" in str(e).lower() or "revoked" in str(e).lower():
                raise Exception("GMAIL_DISCONNECTED")
            raise

    async def renew_watch(self, user_id: uuid.UUID, force: bool = False):
        """
        Renew the Gmail watch subscription to keep push notifications alive.
        Throttled to run at most once per 24 hours unless force=True.
        """
        if not settings.GMAIL_PUBSUB_TOPIC:
            return

        now = time.time()
        last_renewal = SyncService._last_watch_renewal.get(user_id, 0)
        # Gmail watches last 7 days. Only renew if more than 24h passed or forced.
        if not force and (now - last_renewal) < 86400:
            return

        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            logger.warning(f"[Sync:{user_id}] User not found for watch renewal.")
            return
            
        if not user.gmail_credentials:
            logger.warning(f"[Sync:{user_id}] User has no Gmail credentials. Skipping watch renewal.")
            return

        try:
            creds_data = user.gmail_credentials
            creds = Credentials(
                token=creds_data.get('token'),
                refresh_token=creds_data.get('refresh_token'),
                token_uri="https://oauth2.googleapis.com/token",
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET,
                scopes=["https://www.googleapis.com/auth/gmail.readonly"]
            )
            
            # Refresh if needed
            if creds.expired and creds.refresh_token:
                creds.refresh(GoogleRequest())
            
            service = build('gmail', 'v1', credentials=creds)
            
            # CRITICAL FIX: Gmail only allows one watch per (user, app). 
            # If we changed topics or have a stale watch, we must stop it first.
            try:
                service.users().stop(userId='me').execute()
                logger.debug(f"[Sync:{user_id}] Stopped existing Gmail watch to prepare for renewal.")
            except Exception as stop_ex:
                # If there was no watch, this might fail, which is fine.
                logger.debug(f"[Sync:{user_id}] Note: No existing watch to stop or stop failed: {stop_ex}")

            watch_request = {
                'labelIds': ['INBOX'],
                'topicName': settings.GMAIL_PUBSUB_TOPIC
            }
            watch_response = service.users().watch(userId='me', body=watch_request).execute()
            SyncService._last_watch_renewal[user_id] = time.time()
            logger.info(f"[Sync:{user_id}] Successfully renewed Gmail watch. historyId: {watch_response.get('historyId')}")
            
            # Persist refreshed token if it changed
            if creds.token != creds_data.get('token'):
                user.gmail_credentials = {
                    "token": creds.token,
                    "refresh_token": creds.refresh_token,
                    "expiry": creds.expiry.isoformat() if creds.expiry else None
                }
                await self.db.commit()
                
        except Exception as e:
            logger.warning(f"[Sync:{user_id}] Failed to renew Gmail watch: {e}")

    async def get_sync_trends(self, user_id: uuid.UUID, days: int = 30):
        """Get transaction origination trends (Manual vs Automated)."""
        now = time.time()
        if user_id in SyncService._trends_cache:
            ts, data = SyncService._trends_cache[user_id]
            if (now - ts) < self.TRENDS_CACHE_TTL:
                return data

        from sqlalchemy import func, cast, Date
        from app.features.transactions.models import Transaction
        
        # Query transaction counts grouped by date and is_manual
        stmt = (
            select(
                Transaction.transaction_date.label("date"),
                Transaction.is_manual,
                func.count(Transaction.id).label("count")
            )
            .where(Transaction.user_id == user_id)
            .where(Transaction.transaction_date.isnot(None))
            .group_by(Transaction.transaction_date, Transaction.is_manual)
            .order_by(Transaction.transaction_date.desc())
            .limit(days * 2)
        )
        
        result = await self.db.execute(stmt)
        rows = result.all()
        
        trends_map = {}
        for row in rows:
            if not row.date:
                continue
            date_str = row.date.isoformat()
            if date_str not in trends_map:
                trends_map[date_str] = {"date": date_str, "manual": 0, "system": 0}
            
            val = int(row.count or 0)
            if row.is_manual:
                trends_map[date_str]["manual"] += val
            else:
                # Automated (Sync)
                trends_map[date_str]["system"] += val
        
        sorted_trends = sorted(trends_map.values(), key=lambda x: x["date"])
        
        # Cache the result
        SyncService._trends_cache[user_id] = (now, sorted_trends)
        
        return sorted_trends

    async def execute_sync(self, user_id: uuid.UUID, source: str):
        # 0. Concurrency & Debounce Guard: 
        # Skip if another sync is already debouncing or running for this user
        if user_id in SyncService._active_syncs:
            logger.info(f"[Sync:{user_id}] A sync is already PENDING/RUNNING. Skipping redundant {source} trigger.")
            return

        SyncService._active_syncs.add(user_id)
        
        try:
            # 1. Debounce: If triggered by webhook, wait a few seconds to batch incoming burst pings
            if source == "WEBHOOK":
                delay = 5
                logger.info(f"[Sync:{user_id}] Webhook triggered. Debouncing for {delay}s...")
                await asyncio.sleep(delay)

            log = await self._log_start(user_id, source)
            try:
                start_time = await self._get_last_sync_time(user_id)
                logger.info(f"[Sync:{user_id}] Starting sync. source={source}, last_sync={start_time.isoformat() if start_time else 'FIRST_SYNC'}")
                
                # Renew watch proactively on manual/scheduled syncs.
                # Never renew on WEBHOOK triggers as watch() produces a new Pub/Sub message causing an infinite loop.
                if source != "WEBHOOK":
                    await self.renew_watch(user_id)
                
                import time
                t_fetch_start = time.perf_counter()
                messages = await self.fetch_gmail_changes(user_id, start_time)
                t_fetch = (time.perf_counter() - t_fetch_start) * 1000
                logger.info(f"[Sync:{user_id}] Gmail fetch complete. Found {len(messages)} items in {t_fetch:.2f}ms")
                
                if not messages:
                    logger.info(f"[Sync:{str(user_id)[:8]}] No messages returned from Gmail. Completing with 0 records.")
                    empty_summary = {
                        "total_fetched": 0,
                        "imported_count": 0,
                        "non_transaction_count": 0,
                        "duplicate_count": 0,
                        "items": []
                    }
                    await self._log_end(log, "SUCCESS", 0, summary=empty_summary)
                    return

                # Initialize in-progress summary so polling client immediately sees total message count
                log.summary = json.dumps({
                    "total_fetched": len(messages),
                    "imported_count": 0,
                    "non_transaction_count": 0,
                    "duplicate_count": 0,
                    "last_activity": datetime.now(timezone.utc).isoformat(),
                    "items": []
                })
                await self.db.commit()
                
                # Fetch categories once for context
                db_categories = await self.category_service.get_categories(user_id)
                
                # Build hierarchy for context: "Category (Sub1, Sub2, Sub3)"
                cat_list = []
                for c in db_categories:
                    subs = [s.name for s in c.sub_categories]
                    if subs:
                        cat_list.append(f"{c.name}: [{', '.join(subs)}]")
                    else:
                        cat_list.append(c.name)
            
                processed_count = 0
                dedup_skipped = 0
                llm_failed = 0
                zero_amount_skipped = 0
                sync_items = []

                for msg in messages:
                    t_item_start = time.perf_counter()
                    msg_id = msg['id']
                    msg_subject = msg.get('subject', 'No Subject')
                    msg_sender = msg.get('sender', '')

                    dedup_payload = f"{msg_id}:{msg['internalDate']}"
                    content_hash = hashlib.sha256(dedup_payload.encode()).hexdigest()
                    
                    existing_txn = await self.txn_service.get_transaction_by_hash(content_hash)
                    if existing_txn:
                        logger.info(f"⏭️ [Sync:{str(user_id)[:8]}] Duplicate message skipped.")
                        dedup_skipped += 1
                        t_item = (time.perf_counter() - t_item_start) * 1000
                        sync_items.append({
                            "id": msg_id,
                            "transaction_id": str(existing_txn.id),
                            "subject": msg_subject,
                            "sender": msg_sender,
                            "status": "DUPLICATE",
                            "verdict": "DUPLICATE",
                            "validation_status": existing_txn.status,
                            "reason": f"Already imported (Status: {existing_txn.status})",
                            "time_taken_ms": round(t_item),
                            "amount": float(existing_txn.amount) if existing_txn.amount else None,
                            "merchant": existing_txn.merchant_name,
                            "category": existing_txn.category,
                            "account_type": existing_txn.account_type
                        })
                        # Live intermediate progress commit
                        log.summary = json.dumps({
                            "total_fetched": len(messages),
                            "imported_count": processed_count,
                            "non_transaction_count": zero_amount_skipped,
                            "duplicate_count": dedup_skipped,
                            "last_activity": datetime.now(timezone.utc).isoformat(),
                            "items": sync_items
                        })
                        await self.db.commit()
                        continue
                    
                    # Sanitize and send to extraction pipeline
                    raw_body = msg['body'] or msg['snippet']
                    clean_text = self.sanitizer.sanitize(raw_body)
                    
                    t_brain_start = time.perf_counter()
                    extracted = await self.call_brain_api(
                        text=clean_text,
                        user_id=user_id,
                        categories_context=cat_list,
                        subject=msg_subject,
                        sender=msg_sender
                    )
                    t_brain = (time.perf_counter() - t_brain_start) * 1000
                    
                    # Skip if non-transaction or no valid amount was extracted
                    if not extracted.get("is_transaction", True) or abs(extracted.get("amount", 0.0)) == 0:
                        zero_amount_skipped += 1
                        sync_items.append({
                            "id": msg_id,
                            "transaction_id": None,
                            "subject": msg_subject,
                            "sender": msg_sender,
                            "status": "NON_TRANSACTION",
                            "verdict": "NON_TRANSACTION",
                            "validation_status": "EXCLUDED",
                            "reason": extracted.get("reason") or "Classified as non-financial notification (no balance change)",
                            "time_taken_ms": round(t_brain),
                            "amount": 0.0,
                            "merchant": None,
                            "category": None
                        })
                        # Live intermediate progress commit
                        log.summary = json.dumps({
                            "total_fetched": len(messages),
                            "imported_count": processed_count,
                            "non_transaction_count": zero_amount_skipped,
                            "duplicate_count": dedup_skipped,
                            "last_activity": datetime.now(timezone.utc).isoformat(),
                            "items": sync_items
                        })
                        await self.db.commit()
                        continue

                    mapping = await self.txn_service.get_merchant_mapping(extracted["merchant_name"])
                    cat, sub = extracted["category"], extracted["sub_category"]
                    
                    # Use mapping if available overrides
                    if mapping:
                        cat, sub = mapping.default_category, mapping.default_sub_category
                    
                    # Determine amount sign based on explicit type or category
                    final_amount = abs(extracted["amount"])
                    
                    if extracted.get("transaction_type") == "DEBIT" and cat != "Income":
                        final_amount = -final_amount
                    elif cat == "Income" or extracted.get("transaction_type") == "CREDIT":
                        final_amount = final_amount
                    else:
                        final_amount = -final_amount

                    # Fetch surety status
                    stmt = select(SubCategory.is_surety).where(SubCategory.name == sub).limit(1)
                    res = await self.db.execute(stmt)
                    is_surety_flag = res.scalar() or False

                    # Use date extracted from email body; fall back to Gmail delivery date
                    tx_date = None
                    if extracted.get("extracted_date"):
                        try:
                            from dateutil import parser as dateparser
                            tx_date = dateparser.parse(extracted["extracted_date"]).date()
                        except Exception:
                            pass
                    if not tx_date:
                        tx_date = datetime.fromtimestamp(int(msg['internalDate']) / 1000).date()

                    # Append sanitized subject to remarks for better manual review
                    clean_subject = self.sanitizer.sanitize(msg_subject)
                    ext_icon = extracted.get("extractor", "")
                    prefix = f"{ext_icon} | " if ext_icon else ""
                    improved_remarks = f"{prefix}Synced via {source} | Subject: {clean_subject}"

                    new_txn = await self.txn_service.create_transaction({
                        "id": uuid.uuid4(),
                        "user_id": user_id,
                        "raw_content_hash": content_hash,
                        "transaction_date": tx_date,
                        "amount": final_amount,
                        "currency": extracted["currency"],
                        "merchant_name": extracted["merchant_name"],
                        "category": cat,
                        "sub_category": sub,
                        "status": TransactionStatus.PENDING,
                        "account_type": extracted["account_type"],
                        "remarks": improved_remarks,
                        "is_surety": is_surety_flag
                    })
                    logger.info(f"💾 [Sync:{str(user_id)[:8]}] Recorded new PENDING transaction | Category: {cat}")
                    
                    # Attempt to map to Wealth/Investment (INTEGRATED)
                    wealth_mapped = False
                    try:
                        wealth_mapped = await self.wealth_service.process_transaction_match(new_txn)
                    except Exception as w_ex:
                        logger.error(f"[Sync:{str(user_id)[:8]}] Wealth mapping failed for transaction: {type(w_ex).__name__}")

                    sync_items.append({
                        "id": msg_id,
                        "transaction_id": str(new_txn.id),
                        "subject": msg_subject,
                        "sender": msg_sender,
                        "status": "IMPORTED",
                        "verdict": "TRANSACTION",
                        "validation_status": new_txn.status,
                        "reason": extracted.get("reason") or f"Real money {extracted.get('transaction_type', 'DEBIT').lower()} ({cat})",
                        "time_taken_ms": round(t_brain),
                        "amount": final_amount,
                        "merchant": extracted["merchant_name"],
                        "category": cat,
                        "sub_category": sub,
                        "account_type": extracted.get("account_type"),
                        "transaction_type": extracted.get("transaction_type"),
                        "wealth_mapped": wealth_mapped
                    })

                    processed_count += 1
                    # Live intermediate progress commit
                    log.records_processed = processed_count
                    log.summary = json.dumps({
                        "total_fetched": len(messages),
                        "imported_count": processed_count,
                        "non_transaction_count": zero_amount_skipped,
                        "duplicate_count": dedup_skipped,
                        "last_activity": datetime.now(timezone.utc).isoformat(),
                        "items": sync_items
                    })
                    await self.db.commit()
                
                if processed_count > 0:
                    try:
                        from app.features.analytics.service import AnalyticsService
                        AnalyticsService.invalidate_safe_spend_cache(user_id)
                    except Exception as ex:
                        logger.warning(f"[Sync:{user_id}] Safe spend cache invalidation failed: {ex}")

                logger.info(
                    f"📊 [Sync:{str(user_id)[:8]}] Sync Summary: "
                    f"Total Fetched: {len(messages)} | "
                    f"New Transactions: {processed_count} | "
                    f"Non-Transactions Filtered: {zero_amount_skipped} | "
                    f"Duplicates Skipped: {dedup_skipped} | "
                    f"Errors: {llm_failed}"
                )
                sync_summary_payload = {
                    "total_fetched": len(messages),
                    "imported_count": processed_count,
                    "non_transaction_count": zero_amount_skipped,
                    "duplicate_count": dedup_skipped,
                    "items": sync_items
                }
                await self._log_end(log, "SUCCESS", processed_count, summary=sync_summary_payload)
                
            except Exception as e:
                error_type = type(e).__name__
                logger.error(f"[Sync:{str(user_id)[:8]}] Sync process FAILED: {error_type}")
                if str(e) == "GMAIL_DISCONNECTED":
                    # Fetch user for notification
                    result = await self.db.execute(select(User).where(User.id == user_id))
                    user = result.scalar_one_or_none()
                    if user and user.email:
                        await self.notification_service.notify_gmail_disconnection(user_id, user.email, user.full_name or "Grip User")
                    await self._log_end(log, "FAILED", 0, "Gmail connection lost. Please reconnect.")
                else:
                    await self._log_end(log, "FAILED", 0, f"{error_type}")
                    
        except Exception as e:
            logger.error(f"[Sync:{str(user_id)[:8]}] Fatal error in execute_sync: {type(e).__name__}")
        finally:
            # 3. Release the guard so next sync can run
            SyncService._active_syncs.discard(user_id)
