import re

class SanitizerService:
    def __init__(self):
        # Regex Patterns
        self.patterns = {
            'PHONE': re.compile(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,}\b'),
            'UPI': re.compile(r'[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}'),
            'EMAIL': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            'CARD': re.compile(r'\b(?:\d[ -]*?){13,16}\b'),
            'IP': re.compile(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'),
            'PAN': re.compile(r'\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b'),
            'AADHAAR': re.compile(r'\b\d{4}\s\d{4}\s\d{4}\b'),
        }
    def sanitize(self, text: str) -> str:
        if not text:
            return text
        for label, pattern in self.patterns.items():
            text = pattern.sub(f'<{label}>', text)
        return text

_sanitizer = None

def get_sanitizer_service():
    global _sanitizer
    if _sanitizer is None:
        _sanitizer = SanitizerService()
    return _sanitizer
