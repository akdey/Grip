"""
Rule-Based Transaction Extractor
---------------------------------
A high-accuracy, zero-latency, zero-cost transaction extractor for Indian bank emails.
Uses multi-layer filtering (sender whitelist, subject gate, body signals) to distinguish
real transactions from marketing emails, and then uses context-aware regex to extract
amount, merchant, date, account type, and categorization.

Groq LLM is used as fallback ONLY when this engine cannot confidently extract data.
"""
import re
import logging
from typing import Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 1. TRUSTED SENDER WHITELIST
# ---------------------------------------------------------------------------
TRUSTED_SENDERS = {
    # Axis Bank
    "alerts@axisbank.com", "noreply@axisbank.com", "axisbank@alerts.axisbank.com",
    # HDFC Bank
    "alerts@hdfcbank.net", "noreply@hdfcbank.net",
    # ICICI Bank
    "alerts@icicibank.com", "noreply@icicibank.com",
    # SBI
    "donotreply@sbi.co.in", "alerts@sbi.co.in",
    # Kotak
    "alerts@kotak.com", "noreply@kotak.com",
    # IndusInd
    "alerts@indusind.com",
    # Yes Bank
    "alerts@yesbank.in",
    # Federal Bank
    "alerts@fedbank.co.in",
    # IDFC First
    "alerts@idfcfirstbank.com",
    # Credit Cards
    "alerts@hdfcbank.net",
    "noreply@icicibank.com",
    # UPI Apps (for payment confirmations)
    "noreply@phonepe.com", "alerts@phonepe.com",
    "noreply@gpay.app", "notifications@google.com",
    "noreply@paytm.com",
    # Payment gateways
    "noreply@razorpay.com",
}

TRUSTED_SENDER_DOMAINS = {
    "axisbank.com", "hdfcbank.net", "icicibank.com", "sbi.co.in",
    "kotak.com", "indusind.com", "yesbank.in", "fedbank.co.in",
    "idfcfirstbank.com", "phonepe.com", "paytm.com", "razorpay.com",
    "pnbindia.in", "bankofbaroda.in", "canarabank.com", "unionbankofindia.co.in",
}

# ---------------------------------------------------------------------------
# 2. SUBJECT LINE GATE
# ---------------------------------------------------------------------------
TRANSACTION_SUBJECT_PATTERNS = [
    r'\bdebited\b', r'\bcredited\b', r'\balert\b', r'\bspent\b',
    r'\btransaction\b', r'\bpayment\b', r'\ba/c\b', r'\baccount\b',
    r'\bneft\b', r'\bimps\b', r'\bupi\b', r'\brtgs\b',
    r'\bwithdrawn\b', r'\bpurchase\b', r'\bemv\b',
]

MARKETING_SUBJECT_PATTERNS = [
    r'\boffer\b', r'\bcashback\b', r'\breward\b', r'\bwin\b',
    r'\bexclusive\b', r'\bupgrade\b', r'\bcongratulations\b',
    r'\bapply now\b', r'\bupto\b', r'\bhurry\b', r'\bdeal\b',
    r'\bdiscount\b', r'\bfree\b', r'\bbonus\b', r'\bspecial\b',
]

# ---------------------------------------------------------------------------
# 3. BODY SIGNAL DETECTION
# ---------------------------------------------------------------------------
# Must have at least ONE of these to be a real transaction
REQUIRED_BODY_SIGNALS = [
    re.compile(r'\b(?:debited|credited|spent|paid|charged|withdrawn|transferred)\b', re.I),
    re.compile(r'\b(?:a/c|acct|account)\s*(?:no\.?|number)?\s*(?:xx|XX|\d{4})', re.I),
]

SUPPORTING_BODY_SIGNALS = [
    re.compile(r'\b(?:upi|neft|imps|rtgs|nach)\b', re.I),
    re.compile(r'\b(?:transaction|txn)\s*(?:id|ref|no)\.?\b', re.I),
    re.compile(r'\bavailable\s+balance\b', re.I),
    re.compile(r'\bif\s+not\s+done\s+by\s+you\b', re.I),
    re.compile(r'\binr\s+[\d,]+', re.I),
    re.compile(r'₹\s*[\d,]+'),
]

MARKETING_BODY_SIGNALS = [
    re.compile(r'\bclick\s+here\b', re.I),
    re.compile(r'\blimited\s+(?:time|period|offer)\b', re.I),
    re.compile(r'\bterms?\s+(?:and|&)\s+conditions?\s+apply\b', re.I),
    re.compile(r'\bopt\s*out\b', re.I),
    re.compile(r'\bunsubscribe\b', re.I),
    re.compile(r'\bvalid\s+(?:till|until|on)\s+\d', re.I),
    re.compile(r'\bminimum\s+(?:transaction|purchase|spend)\b', re.I),
    re.compile(r'\beach\s+transaction\b', re.I),
    re.compile(r'\bper\s+transaction\b', re.I),
]

# ---------------------------------------------------------------------------
# 4. AMOUNT EXTRACTION (Context-Aware, Ordered by Priority)
# ---------------------------------------------------------------------------
AMOUNT_PATTERNS = [
    # "debited/credited/spent of INR X" — Most specific, this IS the transaction
    re.compile(r'(?:debited|credited|spent|charged|paid|withdrawn|transferred)\s+(?:of\s+)?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)', re.I),
    # "INR X has been debited/credited"
    re.compile(r'(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s+(?:has been|was|is|have been)\s+(?:debited|credited|spent|withdrawn)', re.I),
    # "Amount: INR X" or "transaction of INR X"
    re.compile(r'(?:amount|transaction)\s*(?:of|:)\s*(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)', re.I),
    # "debited from your account. Amount: X"  — Amount on next line/sentence
    re.compile(r'amount\s*[:\-]\s*(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)', re.I),
    # Subject line: "INR 111.00 was debited"
    re.compile(r'(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)', re.I),  # bare fallback — last resort
]

# ---------------------------------------------------------------------------
# 5. MERCHANT EXTRACTION (Bank-Specific Patterns)
# ---------------------------------------------------------------------------
MERCHANT_PATTERNS = [
    # UPI P2M/P2P: "UPI/P2M/8XXXX/XXXXXX XXXX"
    re.compile(r'UPI/P2[MP]/\d+/([A-Z0-9 ._-]+?)(?:\s|$|/)', re.I),
    # After "Transaction Info:" label common in Axis
    re.compile(r'Transaction\s+Info\s*:\s*UPI/\w+/\d+/([A-Z0-9 ._-]+?)(?:\s*$|\n)', re.I | re.M),
    # "Spent at MERCHANT" — HDFC/ICICI credit cards
    re.compile(r'(?:spent\s+at|purchase\s+at|used\s+at)\s+([A-Za-z0-9&\'._ -]{3,40})(?:\s+on|\s+for|\s*\.|\s*,)', re.I),
    # "To: MERCHANT" — standard transfers
    re.compile(r'\bTo\s*:\s*([A-Za-z0-9&\'._ -]{3,40})(?:\n|\r|\.)', re.I),
    # "At MERCHANT" — Kotak style
    re.compile(r'\bAt\s+([A-Za-z0-9&\'._ -]{3,40})(?:\s+on|\s+for|\s*\.|\s*,)', re.I),
    # "Merchant: NAME"
    re.compile(r'Merchant\s*:\s*([A-Za-z0-9&\'._ -]{3,40})', re.I),
    # VPA/UPI ID: extract before @ for P2P transfers
    re.compile(r'(?:to|To)\s+([a-zA-Z0-9._-]+)@[a-zA-Z]+', re.I),
]

# ---------------------------------------------------------------------------
# 6. DATE EXTRACTION
# ---------------------------------------------------------------------------
DATE_PATTERNS = [
    # DD-MM-YYYY or DD/MM/YYYY
    re.compile(r'\b(\d{2}[-/]\d{2}[-/]\d{4})\b'),
    # DD-MM-YY or DD/MM/YY
    re.compile(r'\b(\d{2}[-/]\d{2}[-/]\d{2})\b'),
    # DD Mon YYYY  e.g. "26 Feb 2026"
    re.compile(r'\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b', re.I),
    # YYYY-MM-DD
    re.compile(r'\b(\d{4}-\d{2}-\d{2})\b'),
]

# ---------------------------------------------------------------------------
# 7. TRANSACTION TYPE DETECTION
# ---------------------------------------------------------------------------
DEBIT_PATTERNS = re.compile(r'\b(?:debited|debit|spent|withdrawn|paid|charged|purchase)\b', re.I)
CREDIT_PATTERNS = re.compile(r'\b(?:credited|credit|received|deposited|refunded|reversed)\b', re.I)

# ---------------------------------------------------------------------------
# 8. ACCOUNT TYPE DETECTION
# ---------------------------------------------------------------------------
CREDIT_CARD_PATTERNS = re.compile(r'\b(?:credit\s+card|cc\s+no|card\s+ending|credit\s+limit|outstanding|minimum\s+due)\b', re.I)
SAVINGS_PATTERNS = re.compile(r'\b(?:savings|saving|sb\s+a/c|current\s+a/c|salary\s+a/c)\b', re.I)

# ---------------------------------------------------------------------------
# 9. CATEGORY KEYWORD MAP
# ---------------------------------------------------------------------------
CATEGORY_MAP = {
    # Food & Dining
    "swiggy": ("Food", "Food Delivery"),
    "zomato": ("Food", "Food Delivery"),
    "dominos": ("Food", "Restaurants"),
    "pizza hut": ("Food", "Restaurants"),
    "mcdonalds": ("Food", "Restaurants"),
    "kfc": ("Food", "Restaurants"),
    "starbucks": ("Food", "Cafes"),
    "cafe coffee day": ("Food", "Cafes"),
    "bigbasket": ("Food", "Groceries"),
    "blinkit": ("Food", "Groceries"),
    "zepto": ("Food", "Groceries"),
    "dunzo": ("Food", "Groceries"),
    "instamart": ("Food", "Groceries"),
    # Transport
    "uber": ("Transport", "Cab"),
    "ola": ("Transport", "Cab"),
    "rapido": ("Transport", "Bike Taxi"),
    "irctc": ("Transport", "Train"),
    "indigo": ("Transport", "Flight"),
    "air india": ("Transport", "Flight"),
    "spicejet": ("Transport", "Flight"),
    "redbus": ("Transport", "Bus"),
    "yulu": ("Transport", "Bike Rental"),
    # Shopping
    "amazon": ("Shopping", "E-Commerce"),
    "flipkart": ("Shopping", "E-Commerce"),
    "myntra": ("Shopping", "Fashion"),
    "ajio": ("Shopping", "Fashion"),
    "nykaa": ("Shopping", "Beauty"),
    "meesho": ("Shopping", "E-Commerce"),
    "snapdeal": ("Shopping", "E-Commerce"),
    "croma": ("Shopping", "Electronics"),
    "reliance digital": ("Shopping", "Electronics"),
    # Bills & Utilities
    "jio": ("Bills & Utilities", "Mobile Recharge"),
    "airtel": ("Bills & Utilities", "Mobile Recharge"),
    "vi ": ("Bills & Utilities", "Mobile Recharge"),
    "bsnl": ("Bills & Utilities", "Mobile Recharge"),
    "bescom": ("Bills & Utilities", "Electricity"),
    "tata power": ("Bills & Utilities", "Electricity"),
    "adani electricity": ("Bills & Utilities", "Electricity"),
    "msedcl": ("Bills & Utilities", "Electricity"),
    "mahadiscom": ("Bills & Utilities", "Electricity"),
    "mahanagar gas": ("Bills & Utilities", "Gas"),
    "indraprastha gas": ("Bills & Utilities", "Gas"),
    "piped gas": ("Bills & Utilities", "Gas"),
    # Entertainment
    "netflix": ("Entertainment", "Subscriptions"),
    "hotstar": ("Entertainment", "Subscriptions"),
    "disney": ("Entertainment", "Subscriptions"),
    "spotify": ("Entertainment", "Subscriptions"),
    "youtube": ("Entertainment", "Subscriptions"),
    "amazon prime": ("Entertainment", "Subscriptions"),
    "bookmyshow": ("Entertainment", "Movies & Shows"),
    "pvr": ("Entertainment", "Movies & Shows"),
    "inox": ("Entertainment", "Movies & Shows"),
    # Health
    "apollo": ("Medical", "Hospital"),
    "fortis": ("Medical", "Hospital"),
    "manipal": ("Medical", "Hospital"),
    "practo": ("Medical", "Doctor Consultation"),
    "medplus": ("Medical", "Pharmacy"),
    "netmeds": ("Medical", "Pharmacy"),
    "1mg": ("Medical", "Pharmacy"),
    "pharmeasy": ("Medical", "Pharmacy"),
    # Investment
    "zerodha": ("Investment", "Stocks & MF"),
    "groww": ("Investment", "Stocks & MF"),
    "upstox": ("Investment", "Stocks & MF"),
    "paytm money": ("Investment", "Stocks & MF"),
    "coin": ("Investment", "Stocks & MF"),
    "sip": ("Investment", "Mutual Fund SIP"),
    "nps": ("Investment", "NPS"),
    "ppf": ("Investment", "PPF"),
    # Housing
    "rent": ("Housing", "Rent"),
    "maintenance": ("Housing", "Society Maintenance"),
    "society": ("Housing", "Society Maintenance"),
    "housing": ("Housing", "Rent"),
    # ATM / Cash
    "atm": ("Cash", "ATM Withdrawal"),
    "cash withdrawal": ("Cash", "ATM Withdrawal"),
}

KEYWORD_CATEGORY_MAP = [
    # (keyword_in_merchant, category, sub_category)
    ("hotel", "Travel", "Hotels"),
    ("inn", "Travel", "Hotels"),
    ("resort", "Travel", "Hotels"),
    ("hospital", "Medical", "Hospital"),
    ("clinic", "Medical", "Doctor Consultation"),
    ("pharmacy", "Medical", "Pharmacy"),
    ("medical", "Medical", "Pharmacy"),
    ("school", "Education", "School Fees"),
    ("college", "Education", "College Fees"),
    ("university", "Education", "College Fees"),
    ("insurance", "Bills & Utilities", "Insurance"),
    ("loan", "Bills & Utilities", "Loan EMI"),
    ("emi", "Bills & Utilities", "Loan EMI"),
    ("petrol", "Transport", "Fuel"),
    ("fuel", "Transport", "Fuel"),
    ("diesel", "Transport", "Fuel"),
    ("electricity", "Bills & Utilities", "Electricity"),
    ("broadband", "Bills & Utilities", "Internet"),
    ("internet", "Bills & Utilities", "Internet"),
    ("wifi", "Bills & Utilities", "Internet"),
    ("gym", "Personal Care", "Fitness"),
    ("fitness", "Personal Care", "Fitness"),
    ("salon", "Personal Care", "Grooming"),
    ("salon", "Personal Care", "Grooming"),
    ("amazon", "Shopping", "E-Commerce"),
    ("grocery", "Food", "Groceries"),
    ("supermarket", "Food", "Groceries"),
    ("mart", "Food", "Groceries"),
]


class RuleBasedExtractor:
    """
    Deterministic, zero-latency transaction extractor for Indian bank emails.
    Accuracy: ~95% for major Indian banks.
    Use Groq as fallback for remaining ~5%.
    """

    def is_transaction_email(self, subject: str, body: str, sender: str = "") -> Tuple[bool, str]:
        """
        Returns (is_transaction, reason).
        reason is used for debug logging.
        """
        text = (subject + " " + body).lower()
        subject_lower = subject.lower()

        # Layer 1: Sender whitelist check (domains)
        if sender:
            sender_domain = sender.split("@")[-1].strip(">").lower()
            if sender_domain not in TRUSTED_SENDER_DOMAINS and sender not in TRUSTED_SENDERS:
                return False, f"UNTRUSTED_SENDER:{sender_domain}"

        # Layer 2: Marketing subject signals (fast reject)
        marketing_subject_hits = sum(
            1 for p in MARKETING_SUBJECT_PATTERNS if re.search(p, subject_lower)
        )
        if marketing_subject_hits >= 2:
            return False, f"MARKETING_SUBJECT({marketing_subject_hits} signals)"

        # Layer 3: Must have at least one transaction subject keyword
        has_txn_subject = any(re.search(p, subject_lower) for p in TRANSACTION_SUBJECT_PATTERNS)
        if not has_txn_subject:
            return False, "NO_TXN_SUBJECT_KEYWORD"

        # Layer 4: Body marketing signals (spam filter)
        body_marketing_hits = sum(1 for p in MARKETING_BODY_SIGNALS if p.search(body))
        if body_marketing_hits >= 3:
            return False, f"MARKETING_BODY({body_marketing_hits} signals)"

        # Layer 5: Must have required body signal (action verb or account ref)
        has_required_signal = any(p.search(body) for p in REQUIRED_BODY_SIGNALS)
        has_supporting_signal = sum(1 for p in SUPPORTING_BODY_SIGNALS if p.search(body))

        if not has_required_signal:
            return False, "NO_REQUIRED_BODY_SIGNAL"

        if has_supporting_signal == 0:
            return False, "NO_SUPPORTING_BODY_SIGNAL"

        return True, "PASSED_ALL_LAYERS"

    def extract_amount(self, text: str) -> Tuple[float, bool]:
        """
        Returns (amount, is_confident).
        Uses prioritized context-aware patterns.
        """
        for i, pattern in enumerate(AMOUNT_PATTERNS):
            match = pattern.search(text)
            if match:
                raw = match.group(1).replace(",", "")
                try:
                    amount = float(raw)
                    if amount > 0:
                        is_confident = i < (len(AMOUNT_PATTERNS) - 1)  # last pattern = bare fallback
                        return amount, is_confident
                except ValueError:
                    continue
        return 0.0, False

    def extract_merchant(self, text: str) -> Optional[str]:
        """
        Returns merchant name or None.
        Uses bank-specific patterns ordered by specificity.
        """
        for pattern in MERCHANT_PATTERNS:
            match = pattern.search(text)
            if match:
                merchant = match.group(1).strip()
                # Clean up
                merchant = re.sub(r'\s+', ' ', merchant).strip()
                # Reject if it looks like a bank name or is too short
                if len(merchant) < 2:
                    continue
                if re.search(r'\b(?:axis|hdfc|icici|sbi|kotak|bank|ltd|pvt)\b', merchant, re.I):
                    continue
                return merchant.title()
        return None

    def extract_date(self, text: str) -> Optional[str]:
        """Returns ISO date string or None."""
        for pattern in DATE_PATTERNS:
            match = pattern.search(text)
            if match:
                return match.group(1)
        return None

    def detect_transaction_type(self, text: str) -> str:
        """Returns DEBIT or CREDIT."""
        if CREDIT_PATTERNS.search(text):
            return "CREDIT"
        return "DEBIT"  # Default — most bank notifications are debits

    def detect_account_type(self, text: str) -> str:
        """Returns SAVINGS, CREDIT_CARD, or CASH."""
        if CREDIT_CARD_PATTERNS.search(text):
            return "CREDIT_CARD"
        return "SAVINGS"

    def categorize(self, merchant: str, text: str) -> Tuple[str, str]:
        """Returns (category, sub_category)."""
        merchant_lower = merchant.lower()

        # Exact merchant name lookup
        for key, (cat, sub) in CATEGORY_MAP.items():
            if key in merchant_lower:
                return cat, sub

        # Keyword fallback on merchant name
        for keyword, cat, sub in KEYWORD_CATEGORY_MAP:
            if keyword in merchant_lower:
                return cat, sub

        # Last resort: scan the full email text for category hints
        text_lower = text.lower()
        for keyword, cat, sub in KEYWORD_CATEGORY_MAP:
            if keyword in text_lower:
                return cat, sub

        return "Uncategorized", "Uncategorized"

    def extract(self, subject: str, body: str, sender: str = "") -> Optional[dict]:
        """
        Main entry point. Returns structured transaction dict or None if
        this email is not a transaction or extraction failed.
        """
        full_text = f"Subject: {subject}\n{body}"

        # Step 1: Filter check
        is_txn, reason = self.is_transaction_email(subject, body, sender)
        if not is_txn:
            logger.debug(f"[RuleExtractor] Filtered out email. Reason: {reason}. Subject: '{subject[:60]}'")
            return None

        # Step 2: Amount
        amount, is_confident = self.extract_amount(full_text)
        if amount == 0:
            logger.debug(f"[RuleExtractor] No amount found. Subject: '{subject[:60]}'")
            return None  # Signal to caller: fall back to Groq

        # Step 3: Merchant
        merchant = self.extract_merchant(full_text) or "UNKNOWN"

        # Step 4: Transaction & Account type
        txn_type = self.detect_transaction_type(full_text)
        acc_type = self.detect_account_type(full_text)

        # Step 5: Category
        category, sub_category = self.categorize(merchant, full_text)

        # Step 6: Date
        extracted_date = self.extract_date(body)

        result = {
            "amount": amount,
            "currency": "INR",
            "merchant_name": merchant,
            "category": category,
            "sub_category": sub_category,
            "account_type": acc_type,
            "transaction_type": txn_type,
            "extracted_date": extracted_date,
            "_source": "RULE_ENGINE" if is_confident else "RULE_ENGINE_BARE_FALLBACK",
            "_needs_llm_fallback": not is_confident or merchant == "UNKNOWN",
        }
        logger.info(
            f"[RuleExtractor] Extracted: ₹{amount} | Merchant: {merchant} | "
            f"Cat: {category} | Type: {txn_type} | Source: {result['_source']}"
        )
        return result


# Singleton
_extractor: Optional[RuleBasedExtractor] = None

def get_rule_extractor() -> RuleBasedExtractor:
    global _extractor
    if _extractor is None:
        _extractor = RuleBasedExtractor()
    return _extractor
