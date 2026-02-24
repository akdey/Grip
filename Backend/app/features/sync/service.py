import hashlib
import uuid
import logging
import json
import base64
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

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
    def __init__(self, 
                 db: AsyncSession = Depends(get_db), 
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

    async def _log_end(self, log: SyncLog, status: str, count: int = 0, error: str = None, summary: List[dict] = None):
        log.end_time = datetime.now()
        log.status = status
        log.records_processed = count
        log.error_message = error
        if summary:
            log.summary = json.dumps(summary)
        await self.db.commit()

    async def call_brain_api(self, text: str, user_id: uuid.UUID, categories_context: List[str] = None) -> dict:
        """Extract transaction details using LLM."""
        if not self.llm.is_enabled:
            logger.warning("LLM service not enabled. Using fallback.")
            return self._fallback_txn()

        # Prepare context
        cat_str = ""
        if categories_context:
            cat_str = "Valid Categories & Sub-Categories (Use these EXACTLY):\n" + "\n".join([f"- {c}" for c in categories_context])
        else:
            cat_str = "Valid Categories: Food, Transport, Shopping, Housing, Bills & Utilities, Investment, Income, Entertainment, Medical, Personal Care"

        prompt = f"""
        Extract transaction details from the following text:
        Text: "{text}"
        
        {cat_str}
        
        Return ONLY a JSON object with these keys:
        - amount: float
        - currency: string (3-letter code, default INR)
        - merchant_name: string (clean, title case)
        - category: string (Must be one of the Valid Categories keys)
        - sub_category: string (Must be one of the sub-categories listed for the chosen category)
        - account_type: string (SAVINGS, CREDIT_CARD, or CASH)
        - transaction_type: string (DEBIT or CREDIT)
        
        If unsure about category, use "Uncategorized".
        If no transaction found, return null.
        """
        
        data = await self.llm.generate_json(prompt, temperature=0.1)
        
        if data:
            # Defensive check for None/null values from LLM
            amt_raw = data.get("amount")
            amt = float(amt_raw) if amt_raw is not None else 0.0
            
            return {
                "amount": amt,
                "currency": data.get("currency", "INR") or "INR",
                "merchant_name": data.get("merchant_name", "UNKNOWN") or "UNKNOWN",
                "category": data.get("category", "Uncategorized") or "Uncategorized",
                "sub_category": data.get("sub_category", "Uncategorized") or "Uncategorized",
                "account_type": data.get("account_type", "SAVINGS") or "SAVINGS",
                "transaction_type": data.get("transaction_type", "DEBIT") or "DEBIT"
            }
            
        return self._fallback_txn()

    def _fallback_txn(self) -> dict:
        return {
            "amount": 0.0,
            "currency": "INR",
            "merchant_name": "UNCATEGORIZED",
            "category": "Uncategorized",
            "sub_category": "Uncategorized",
            "account_type": "SAVINGS",
            "transaction_type": "DEBIT"
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
            # Specific keywords to catch transactions without pulling in too much noise
            query = "debit OR debited OR credit OR alert OR spent"
            if start_time:
                query += f" after:{int(start_time.timestamp())}"
            
            logger.info(f"[Sync:{user_id}] Gmail query: after={start_time.isoformat() if start_time else 'None'}")
            
            results = service.users().messages().list(userId='me', q=query, maxResults=50, includeSpamTrash=True).execute()
            messages = results.get('messages', [])
            
            logger.info(f"[Sync:{user_id}] Gmail returned {len(messages)} message(s) matching query.")

            # After API call, persist any auto-refreshed token back to DB
            if creds.token != creds_data.get('token'):
                logger.info(f"[Sync:{user_id}] Token was auto-refreshed during API call. Saving new token.")
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
                
                body = ""
                parts = msg['payload'].get('parts', [])
                for part in parts:
                    if part['mimeType'] == 'text/plain':
                        data = part['body'].get('data')
                        if data:
                            body = base64.urlsafe_b64decode(data).decode()
                            break
                if not body:
                    data = msg['payload']['body'].get('data')
                    if data:
                        body = base64.urlsafe_b64decode(data).decode()

                if not body:
                    body_extract_failures += 1

                # Extract Subject header
                headers = msg.get('payload', {}).get('headers', [])
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), "No Subject")

                detailed_messages.append({
                    "id": msg['id'],
                    "internalDate": msg['internalDate'],
                    "snippet": msg['snippet'],
                    "subject": subject,
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

    async def get_sync_trends(self, user_id: uuid.UUID, days: int = 30):
        """Get transaction origination trends (Manual vs Automated)."""
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
                
        return sorted(trends_map.values(), key=lambda x: x["date"])

    async def execute_sync(self, user_id: uuid.UUID, source: str):
        log = await self._log_start(user_id, source)
        try:
            start_time = await self._get_last_sync_time(user_id)
            logger.info(f"[Sync:{user_id}] Starting sync. source={source}, last_sync={start_time.isoformat() if start_time else 'FIRST_SYNC'}")
            
            messages = await self.fetch_gmail_changes(user_id, start_time)
            
            if not messages:
                logger.info(f"[Sync:{user_id}] No messages returned from Gmail. Completing with 0 records.")
                await self._log_end(log, "SUCCESS", 0)
                return
            
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
            sync_summary = []

            for msg in messages:
                dedup_payload = f"{msg['id']}:{msg['internalDate']}"
                content_hash = hashlib.sha256(dedup_payload.encode()).hexdigest()
                
                if await self.txn_service.get_transaction_by_hash(content_hash):
                    dedup_skipped += 1
                    continue
                
                # Truncate text to avoid token limits and focus on the core email content
                clean_text = self.sanitizer.sanitize(msg['body'] or msg['snippet'])[:3000]
                extracted = await self.call_brain_api(clean_text, user_id, cat_list)
                
                # Skip if no valid amount was extracted (LLM timeout/failure or non-transaction email)
                if abs(extracted["amount"]) == 0:
                    merchant = extracted.get("merchant_name", "UNKNOWN")
                    if merchant == "UNCATEGORIZED" or merchant == "UNKNOWN":
                        llm_failed += 1
                        logger.warning(f"[Sync:{user_id}] LLM failed for '{msg['subject']}' ({msg['id']}). Snippet: {msg['snippet'][:50]}...")
                    else:
                        zero_amount_skipped += 1
                        logger.info(f"[Sync:{user_id}] ₹0 found for '{merchant}' in '{msg['subject']}'. Skipping.")
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

                # Convert internalDate (ms) to date object for the transaction record
                tx_date = datetime.fromtimestamp(int(msg['internalDate']) / 1000).date()

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
                    "remarks": f"Synced via {source}",
                    "is_surety": is_surety_flag
                })
                
                # Attempt to map to Wealth/Investment (INTEGRATED)
                wealth_mapped = False
                try:
                    wealth_mapped = await self.wealth_service.process_transaction_match(new_txn)
                except Exception as w_ex:
                    logger.error(f"[Sync:{user_id}] Wealth mapping failed for txn {new_txn.id}: {type(w_ex).__name__}")

                sync_summary.append({
                    "id": str(new_txn.id),
                    "merchant": extracted["merchant_name"],
                    "amount": final_amount,
                    "category": cat,
                    "wealth_mapped": wealth_mapped
                })

                processed_count += 1
            
            logger.info(
                f"[Sync:{user_id}] Sync complete. "
                f"fetched={len(messages)}, dedup_skipped={dedup_skipped}, "
                f"llm_failed={llm_failed}, zero_amount_skipped={zero_amount_skipped}, "
                f"processed={processed_count}"
            )
            await self._log_end(log, "SUCCESS", processed_count, summary=sync_summary)
            
        except Exception as e:
            error_type = type(e).__name__
            logger.error(f"[Sync:{user_id}] Sync execution FAILED: {error_type}: {e}")
            if str(e) == "GMAIL_DISCONNECTED":
                # Fetch user for notification
                result = await self.db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                if user and user.email:
                    await self.notification_service.notify_gmail_disconnection(user_id, user.email, user.full_name or "Grip User")
                await self._log_end(log, "FAILED", 0, "Gmail connection lost. Please reconnect.")
            else:
                await self._log_end(log, "FAILED", 0, f"{error_type}: {e}")
