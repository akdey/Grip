import hashlib
import uuid
import httpx
import logging
import json
import base64
from datetime import datetime
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
from app.features.categories.service import CategoryService

settings = get_settings()
logger = logging.getLogger(__name__)



class SyncService:
    def __init__(self, 
                 db: AsyncSession = Depends(get_db), 
                 transaction_service: TransactionService = Depends(),
                 category_service: CategoryService = Depends()):
        self.db = db
        self.txn_service = transaction_service
        self.category_service = category_service
        self.sanitizer = get_sanitizer_service()

    async def _get_last_sync_time(self, user_id: uuid.UUID) -> Optional[datetime]:
        stmt = (
            select(SyncLog)
            .where(SyncLog.user_id == user_id)
            .where(SyncLog.status == "SUCCESS")
            .order_by(desc(SyncLog.start_time))
            .limit(1)
        )
        result = await self.db.execute(stmt)
        log = result.scalar_one_or_none()
        return log.start_time if log else None

    async def _log_start(self, user_id: uuid.UUID, source: str) -> SyncLog:
        log = SyncLog(user_id=user_id, trigger_source=source, status="IN_PROGRESS")
        self.db.add(log)
        await self.db.commit()
        await self.db.refresh(log)
        return log

    async def _log_end(self, log: SyncLog, status: str, count: int = 0, error: str = None):
        log.end_time = datetime.now()
        log.status = status
        log.records_processed = count
        log.error_message = error
        await self.db.commit()

    async def call_brain_api(self, text: str, user_id: uuid.UUID, categories_context: List[str] = None) -> dict:
        """Extract transaction details using Groq LLM."""
        if not settings.GROQ_API_KEY:
            logger.warning("GROQ_API_KEY not set. Using fallback.")
            return self._fallback_txn()

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
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
        
        # Log the full prompt as requested
        logger.info(f"LLM Prompt: {prompt}")

        payload = {
            "model": settings.GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=payload, timeout=20.0)
                
            if response.status_code == 200:
                extracted = response.json()['choices'][0]['message']['content']
                data = json.loads(extracted)
                
                return {
                    "amount": float(data.get("amount", 0)),
                    "currency": data.get("currency", "INR"),
                    "merchant_name": data.get("merchant_name", "UNKNOWN"),
                    "category": data.get("category", "Uncategorized"),
                    "sub_category": data.get("sub_category", "Uncategorized"),
                    "account_type": data.get("account_type", "SAVINGS"),
                    "transaction_type": data.get("transaction_type", "DEBIT")
                }
        except Exception as e:
            logger.error(f"Groq API Error: {e}")
            
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
            return []

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

            if creds.expired and creds.refresh_token:
                creds.refresh(GoogleRequest())
                user.gmail_credentials = {
                    "token": creds.token,
                    "refresh_token": creds.refresh_token,
                    "expiry": creds.expiry.isoformat() if creds.expiry else None
                }
                await self.db.commit()

            service = build('gmail', 'v1', credentials=creds)
            query = "spent OR debited OR transaction OR alert OR paid"
            if start_time:
                query += f" after:{int(start_time.timestamp())}"
            
            results = service.users().messages().list(userId='me', q=query, maxResults=50, includeSpamTrash=True).execute()
            messages = results.get('messages', [])
            
            detailed_messages = []
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

                detailed_messages.append({
                    "id": msg['id'],
                    "internalDate": msg['internalDate'],
                    "snippet": msg['snippet'],
                    "body": body
                })
            
            return detailed_messages

        except Exception as e:
            logger.error(f"Gmail Sync Error: {e}")
            return []

    async def execute_sync(self, user_id: uuid.UUID, source: str):
        log = await self._log_start(user_id, source)
        try:
            start_time = await self._get_last_sync_time(user_id)
            messages = await self.fetch_gmail_changes(user_id, start_time)
            
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
            for msg in messages:
                dedup_payload = f"{msg['id']}:{msg['internalDate']}"
                content_hash = hashlib.sha256(dedup_payload.encode()).hexdigest()
                
                if await self.txn_service.get_transaction_by_hash(content_hash):
                    continue
                
                clean_text = self.sanitizer.sanitize(msg['body'] or msg['snippet'])
                extracted = await self.call_brain_api(clean_text, user_id, cat_list)
                
                mapping = await self.txn_service.get_merchant_mapping(extracted["merchant_name"])
                cat, sub = extracted["category"], extracted["sub_category"]
                
                # Use mapping if available overrides
                if mapping:
                    cat, sub = mapping.default_category, mapping.default_sub_category
                
                # Determine amount sign based on explicit type or category
                final_amount = abs(extracted["amount"])
                
                # Skip if no valid amount was extracted
                if final_amount == 0:
                    continue

                if extracted.get("transaction_type") == "DEBIT" and cat != "Income":
                    final_amount = -final_amount
                elif cat == "Income" or extracted.get("transaction_type") == "CREDIT":
                    final_amount = final_amount
                else:
                    # Default to negative (Expense) if unsure, unless it looks like income
                    final_amount = -final_amount

                # Determine Surety
                # We need to resolve it. Since SyncService has txn_service, let's assume we can use a helper or query directly.
                # But _resolve_surety is private. Let's make it public or query DB here too.
                # Simplest: use category_service to check? category_service deals with ID.
                # Let's perform a lightweight check similar to TransactionService.
                # Actually, TransactionService instance is available. Let's call a public method on it.
                # I'll update TransactionService to make resolve_surety public first? 
                # No, I can't edit previous file easily in same thought without tool.
                # I will assume I can access the DB directly as I have self.db.
                
                # Fetch surety status
                from app.features.categories.models import SubCategory
                stmt = select(SubCategory.is_surety).where(SubCategory.name == sub).limit(1)
                res = await self.db.execute(stmt)
                is_surety_flag = res.scalar() or False

                new_txn = await self.txn_service.create_transaction({
                    "id": uuid.uuid4(),
                    "user_id": user_id,
                    "raw_content_hash": content_hash,
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
                
                # Attempt to map to Wealth/Investment (DISCONNECTED)
                # try:
                #     await self.wealth_service.process_transaction_match(new_txn)
                # except Exception as w_ex:
                #     logger.error(f"Wealth mapping failed for txn {new_txn.id}: {w_ex}")

                processed_count += 1
            
            await self._log_end(log, "SUCCESS", processed_count)
            
        except Exception as e:
            logger.error(f"Sync execution failed: {e}")
            await self._log_end(log, "FAILED", 0, str(e))
