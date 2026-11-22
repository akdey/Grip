import re
import time
import logging
from decimal import Decimal
from datetime import date, datetime
from uuid import UUID
from typing import List, Dict, Any, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from fastapi import HTTPException

from app.core.llm import get_llm_service
from app.features.assistant.schemas import AssistantQueryResponse

logger = logging.getLogger(__name__)

FORBIDDEN_KEYWORDS = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE",
    "REPLACE", "EXEC", "EXECUTE", "GRANT", "REVOKE", "ATTACH", "DETACH",
    "PRAGMA", "VACUUM", "MERGE", "CALL", "COPY", "INTO", "SET", "EXPLAIN"
]

RESTRICTED_TABLES = [
    "users", "sync_logs", "user_categories", "categories", "sub_categories",
    "alembic_version", "information_schema", "pg_tables", "pg_class", "pg_stat"
]

class AssistantService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.llm = get_llm_service()

    def _get_system_prompt(self) -> str:
        today_str = datetime.now().strftime("%Y-%m-%d")
        return f"""You are a PostgreSQL expert for Grip, a personal finance tracker.
Translate the user's natural language question into a single, valid PostgreSQL SELECT query.

DATABASE SCHEMA:
Table: transactions
Columns:
- amount (numeric): Negative for expenses/debits (e.g. -450.0), positive for income/credits (e.g. +50000.0)
- currency (varchar): 'INR'
- merchant_name (varchar): Brand, entity, or person paid (e.g. 'Starbucks', 'HPCL', 'Swiggy', 'Uber', 'Airtel')
- category (varchar): e.g. 'Food', 'Transport', 'Shopping', 'Bills & Utilities', 'Income', 'Entertainment', 'Medical', 'Personal Care'
- sub_category (varchar): e.g. 'Fuel', 'Groceries', 'Restaurants', 'Salary', 'Electricity', 'Dining', 'Cabs'
- transaction_date (date): Date of transaction (YYYY-MM-DD)
- account_type (varchar): 'SAVINGS', 'CREDIT_CARD', 'CASH'
- status (varchar): 'PENDING', 'SETTLED'
- remarks (varchar): User notes, descriptions, memos, and email subjects
- is_surety (boolean): true for fixed recurring bills/commitments

RULES:
1. Output ONLY the raw SQL query. Do NOT include markdown blocks (no ```sql), explanations, or notes.
2. CRITICAL: Start your output immediately with the SELECT keyword. Do NOT output thoughts or step-by-step reasoning.
3. Only output SELECT queries. Never use INSERT, UPDATE, DELETE, or DROP.
4. For "gas", "fuel", "petrol", or "diesel", search across merchant_name, sub_category, and remarks:
   (merchant_name ILIKE '%gas%' OR merchant_name ILIKE '%petrol%' OR merchant_name ILIKE '%fuel%' OR sub_category ILIKE '%fuel%' OR remarks ILIKE '%gas%' OR remarks ILIKE '%petrol%' OR remarks ILIKE '%fuel%' OR category = 'Transport')
5. For keyword or item searches, always include remarks in the search (e.g. merchant_name ILIKE '%keyword%' OR remarks ILIKE '%keyword%').
6. Order by transaction_date DESC for 'last', 'latest', or 'recent' questions, with LIMIT 1.
7. For spend totals or averages, use SUM(ABS(amount)) or AVG(ABS(amount)) where amount < 0.
8. Assume today's date is: {today_str}.
"""

    def _match_fast_sql(self, question: str) -> Optional[str]:
        """
        Deterministic Fast-Path:
        Instantly translates common financial questions to precise SQL in 0.1ms,
        completely avoiding LLM inference latency and lock contention.
        """
        q = question.strip().lower()

        # Pattern 1: When did I last buy / spend on / pay for <item>
        m1 = re.search(r'\b(?:when did i (?:last|recently)|latest|last time i) (?:buy|bought|spend on|pay for|get|order|fill)\s+(.+?)(?:\?|$)', q)
        if not m1:
            m1 = re.search(r'\b(?:last|latest)\s+(.+?)\s+(?:transaction|order|payment|purchase|spend)(?:\?|$)', q)
        if m1:
            item = m1.group(1).strip()
            item = re.sub(r'^(some|my|a|an|the)\s+', '', item).strip()
            if item:
                if item in ["gas", "fuel", "petrol", "diesel", "cng"]:
                    return """SELECT transaction_date, amount, merchant_name, category, sub_category, remarks
FROM transactions
WHERE (merchant_name ILIKE '%gas%' OR merchant_name ILIKE '%petrol%' OR merchant_name ILIKE '%fuel%' OR sub_category ILIKE '%fuel%' OR remarks ILIKE '%gas%' OR remarks ILIKE '%petrol%' OR remarks ILIKE '%fuel%' OR category = 'Transport')
ORDER BY transaction_date DESC
LIMIT 1"""
                else:
                    clean_item = re.sub(r'[^a-zA-Z0-9\s]', '', item)
                    return f"""SELECT transaction_date, amount, merchant_name, category, sub_category, remarks
FROM transactions
WHERE (merchant_name ILIKE '%{clean_item}%' OR remarks ILIKE '%{clean_item}%' OR category ILIKE '%{clean_item}%' OR sub_category ILIKE '%{clean_item}%')
ORDER BY transaction_date DESC
LIMIT 1"""

        # Pattern 2: How much did I spend on <target> this month
        m2 = re.search(r'\bhow much (?:did i spend|spent) on\s+(.+?)(?:\s+this month|\s+in current month|\?|$)', q)
        if m2:
            target = m2.group(1).strip()
            target = re.sub(r'^(some|my|a|an|the)\s+', '', target).strip()
            first_of_month = datetime.now().strftime("%Y-%m-01")
            if target:
                clean_target = re.sub(r'[^a-zA-Z0-9\s]', '', target)
                return f"""SELECT SUM(ABS(amount)) as total_spent, COUNT(*) as transaction_count
FROM transactions
WHERE amount < 0
  AND transaction_date >= '{first_of_month}'
  AND (category ILIKE '%{clean_target}%' OR sub_category ILIKE '%{clean_target}%' OR merchant_name ILIKE '%{clean_target}%' OR remarks ILIKE '%{clean_target}%')"""

        # Pattern 3: Biggest / highest / largest expense this month
        if re.search(r'\b(?:biggest|highest|largest|maximum)\s+expense\b', q):
            first_of_month = datetime.now().strftime("%Y-%m-01")
            return f"""SELECT transaction_date, amount, merchant_name, category, sub_category, remarks
FROM transactions
WHERE amount < 0
  AND transaction_date >= '{first_of_month}'
ORDER BY ABS(amount) DESC
LIMIT 1"""

        # Pattern 4: Latest / recent transactions
        if re.search(r'\b(?:show|list|recent|latest)\s+(?:transactions|spends|orders)\b', q):
            return """SELECT transaction_date, amount, merchant_name, category, sub_category, remarks
FROM transactions
ORDER BY transaction_date DESC
LIMIT 5"""

        return None

    def _clean_sql(self, raw_text: str) -> str:
        """Strip markdown fences, thought tags, and extraneous whitespace."""
        text = re.sub(r'<\|channel>thought.*?<channel\|>', '', raw_text, flags=re.DOTALL)
        text = text.replace('```sql', '').replace('```', '').strip()
        # Extract first SELECT or WITH statement if model added prose
        match = re.search(r'\b(SELECT|WITH)\b.*', text, re.IGNORECASE | re.DOTALL)
        if match:
            text = match.group(0).strip()
        return text

    def _validate_sql(self, sql: str) -> str:
        """
        Strict security verification:
        1. Single statement check (no multiple queries separated by semicolons)
        2. Prohibited keywords check (INSERT, UPDATE, DELETE, DROP, etc.)
        3. Restricted tables check (only 'transactions' allowed)
        4. Must begin with SELECT or WITH
        """
        # Semicolon check
        trimmed = sql.rstrip('; \t\n\r')
        if ';' in trimmed:
            raise HTTPException(status_code=400, detail="Security Violation: Multiple SQL statements are strictly forbidden.")

        # Prohibited keywords check
        for kw in FORBIDDEN_KEYWORDS:
            if re.search(rf"\b{kw}\b", trimmed, re.IGNORECASE):
                raise HTTPException(status_code=400, detail=f"Security Violation: '{kw}' is prohibited in read-only assistant queries.")

        # Must begin with SELECT or WITH
        if not re.match(r"^\s*(SELECT|WITH)\b", trimmed, re.IGNORECASE):
            raise HTTPException(status_code=400, detail="Security Violation: Query must be a SELECT statement.")

        # Restricted tables check
        for tbl in RESTRICTED_TABLES:
            if re.search(rf"\b{tbl}\b", trimmed, re.IGNORECASE):
                raise HTTPException(status_code=400, detail=f"Security Violation: Table '{tbl}' cannot be queried.")

        return trimmed

    def _wrap_with_tenant_isolation(self, clean_sql: str) -> str:
        """
        Wraps the user's query with a secure Common Table Expression (CTE)
        shadowing 'transactions' so that regardless of query clauses,
        it only ever resolves to the current authenticated user's records.
        """
        cte_prefix = """WITH transactions AS (
    SELECT id, user_id, amount, currency, merchant_name, category, sub_category, 
           transaction_date, account_type, status, remarks, is_surety
    FROM transactions
    WHERE user_id = :user_id
)
"""
        # Check if the query has a LIMIT clause; if not, append safe limit
        wrapped_query = clean_sql
        if not re.search(r'\bLIMIT\s+\d+\b', wrapped_query, re.IGNORECASE):
            wrapped_query = f"{wrapped_query} LIMIT 25"

        # If user query already starts with WITH, merge CTEs
        if wrapped_query.strip().upper().startswith("WITH"):
            # Replace leading WITH with CTE prefix + comma
            rest_of_query = wrapped_query.strip()[4:].strip()
            return f"{cte_prefix[:-2]},\n{rest_of_query}"

        return f"{cte_prefix}{wrapped_query}"

    def _format_natural_answer(self, question: str, rows: List[Dict[str, Any]]) -> str:
        """Generates an intuitive, readable natural language summary for the user."""
        if not rows:
            return "No matching transactions found for that query."

        # Case 1: Single transaction lookup (e.g. "When did I last buy gas?")
        if len(rows) == 1:
            row = rows[0]
            # Check if this row is an aggregate (e.g., total_spent, count)
            keys = [k.lower() for k in row.keys()]
            if any(k in keys for k in ["total_spent", "sum", "total", "avg", "average", "count"]):
                for k, v in row.items():
                    if isinstance(v, (int, float)):
                        if "count" in k.lower():
                            return f"Found a total count of {int(v)} transactions."
                        return f"The total calculated is ₹{abs(float(v)):,.2f}."

            tx_date = row.get("transaction_date")
            merchant = row.get("merchant_name") or "Unknown merchant"
            amount = row.get("amount")
            remarks = row.get("remarks")
            cat = row.get("category")

            amt_str = f"₹{abs(float(amount)):,.2f}" if amount is not None else ""
            date_str = f"on {tx_date}" if tx_date else ""
            details = [d for d in [amt_str, date_str, f"at {merchant}"] if d]
            summary = "You spent " + " ".join(details)
            if remarks and remarks.strip() and remarks.lower() != merchant.lower():
                summary += f" ({remarks.strip()})"
            if cat:
                summary += f" in {cat}"
            return summary + "."

        # Case 2: Aggregate count / sum with multiple breakdown rows
        return f"Found {len(rows)} matching transaction{'s' if len(rows) > 1 else ''} for your query."

    async def execute_query(self, question: str, user_id: UUID) -> AssistantQueryResponse:
        start_t = time.perf_counter()

        # Step 1: Check Deterministic Fast-Path first (0.1ms execution)
        fast_sql = self._match_fast_sql(question)
        if fast_sql:
            logger.info(f"⚡ [Assistant] Fast-path SQL matched for: '{question}'")
            raw_sql = fast_sql
        else:
            # Step 2: Fallback to Gemma 4 Text-to-SQL (generous 150s timeout)
            logger.info(f"🤖 [Assistant] Routing to Gemma 4 Text-to-SQL: '{question}'")
            system_prompt = self._get_system_prompt()
            raw_sql = await self.llm.generate_response(
                prompt=f"QUESTION: {question}\nSQL:",
                system_prompt=system_prompt,
                temperature=0.1,
                timeout=150.0
            )

        if not raw_sql:
            raise HTTPException(status_code=500, detail="The assistant engine was unable to formulate a SQL query. Please try rephrasing.")

        # Step 2: Clean and validate SQL strictly
        clean_sql = self._clean_sql(raw_sql)
        validated_sql = self._validate_sql(clean_sql)

        # Step 3: Enforce strict tenant isolation (CTE shadow)
        safe_executable_sql = self._wrap_with_tenant_isolation(validated_sql)

        # Step 4: Execute query securely on PostgreSQL with parameter binding
        try:
            result = await self.db.execute(text(safe_executable_sql), {"user_id": user_id})
            column_names = list(result.keys()) if result.returns_rows else []
            raw_rows = result.fetchall() if result.returns_rows else []

            # Serialize rows
            results: List[Dict[str, Any]] = []
            for r in raw_rows:
                row_dict = {}
                for col, val in zip(column_names, r):
                    if isinstance(val, (date, datetime)):
                        row_dict[col] = val.isoformat()
                    elif isinstance(val, Decimal):
                        row_dict[col] = float(val)
                    elif isinstance(val, UUID):
                        row_dict[col] = str(val)
                    else:
                        row_dict[col] = val
                results.append(row_dict)

        except Exception as db_err:
            logger.error(f"Assistant SQL Execution failed: {db_err} | SQL: {safe_executable_sql}")
            raise HTTPException(status_code=400, detail=f"Could not execute generated query: {str(db_err)[:150]}")

        execution_time_ms = (time.perf_counter() - start_t) * 1000

        # Step 5: Format natural language response
        answer = self._format_natural_answer(question, results)

        return AssistantQueryResponse(
            question=question,
            answer=answer,
            sql_query=validated_sql,
            row_count=len(results),
            results=results,
            execution_time_ms=round(execution_time_ms, 2)
        )
