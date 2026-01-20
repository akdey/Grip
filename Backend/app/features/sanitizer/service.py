import re

class SanitizerService:
    def __init__(self):
        # Regex Patterns
        # Regex Patterns
        self.patterns = {
            # Order matters: Specific patterns first
            'UPI': re.compile(r'[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}'),  # Matches amit@okhdfcbank
            'EMAIL': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            'PHONE': re.compile(r'(?:\+?91|0)?[6-9]\d{9}'), # India specific mobile regex
            'CARD': re.compile(r'(?:\d[ -]*?){12,19}'), # 12-19 digits for cards
            'ACCOUNT': re.compile(r'[Xx]+\d{3,6}'), # Matches masked accounts like xxx1234
            'OTP': re.compile(r'\b\d{4,8}\b'), # 4-8 digit standalone numbers (often OTPs or amounts, use carefully)
            'PAN': re.compile(r'[A-Z]{5}[0-9]{4}[A-Z]{1}'),
            'AADHAAR': re.compile(r'\d{4}\s\d{4}\s\d{4}'),
        }
    def sanitize(self, text: str) -> str:
        if not text:
            return text
            
        # Common greeting removal (Dear Customer, Hello Name)
        text = re.sub(r'(?i)(Dear|Hello|Hi)\s+[A-Za-z\s]+,', r'\1 Customer,', text)
        
        for label, pattern in self.patterns.items():
            if label == 'OTP':
                 # Skip generic number replacement to avoid sanitizing amounts, unless it clearly looks like an OTP
                 # For now, let's rely on LLM to ignore OTPs, or be very strict.
                 # Actually, better to NOT sanitize simple numbers blindly as they might be amounts.
                 continue
                 
            text = pattern.sub(f'<{label}>', text)
            
        return text

_sanitizer = None

def get_sanitizer_service():
    global _sanitizer
    if _sanitizer is None:
        _sanitizer = SanitizerService()
    return _sanitizer
