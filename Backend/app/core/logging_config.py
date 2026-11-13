import logging
import sys
import os
import re
from logging.handlers import RotatingFileHandler

from app.core.config import get_settings

# PII & Sensitive Financial Patterns
PII_PATTERNS = {
    'EMAIL': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
    'PHONE': re.compile(r'(?:\+?91|0)?[6-9]\d{9}'),
    'CARD': re.compile(r'\b(?:\d[ -]*?){13,18}\d\b'),
    'ACCOUNT': re.compile(r'[Xx]+\d{3,6}'),
    'PAN': re.compile(r'[A-Z]{5}[0-9]{4}[A-Z]{1}'),
    'AADHAAR': re.compile(r'\d{4}\s\d{4}\s\d{4}'),
    'AMOUNT': re.compile(r'(?:₹\s*[\d,]+(?:\.\d+)?|\b(?:INR|Rs\.?)\s*[\d,]+(?:\.\d+)?)', re.IGNORECASE),
    'BEARER_TOKEN': re.compile(r'(?i)\bbearer\s+[A-Za-z0-9\-_\.~+/=]+'),
    'AUTH_CODE': re.compile(r'(?i)(code=)[A-Za-z0-9\-_/]+'),
}

# Regex to safely truncate 36-character UUIDs to first 8 characters
UUID_PATTERN = re.compile(r'\b([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b', re.IGNORECASE)

# Regex to sanitize auth/refresh tokens in key-value strings or dict dumps
SECRET_PARAM_PATTERN = re.compile(r'(?i)(["\']?(?:access_token|refresh_token|client_secret|api_key)["\']?\s*[:=]\s*["\']?)[^"\'\s,]+')

class PIISanitizingFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        # Original formatted message
        message = super().format(record)
        
        # Sanitize greetings
        message = re.sub(r'(?i)(Dear|Hello|Hi)\s+[A-Za-z\s]+,', r'\1 Customer,', message)
        
        # Sanitize sensitive params / tokens
        message = SECRET_PARAM_PATTERN.sub(r'\1<REDACTED>', message)
        
        # Truncate full UUIDs to prevent revealing complete user/account database IDs
        message = UUID_PATTERN.sub(r'\1...', message)
        
        # Sanitize patterns
        for label, pattern in PII_PATTERNS.items():
            if label == 'AUTH_CODE':
                message = pattern.sub(r'\1<AUTH_CODE>', message)
            elif label == 'BEARER_TOKEN':
                message = pattern.sub(r'Bearer <TOKEN>', message)
            else:
                message = pattern.sub(f'<{label}>', message)
            
        return message

# Configure basic logging to output to console and file
def setup_logging():
    settings = get_settings()
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Custom Formatter
    formatter = PIISanitizingFormatter(log_format)
    
    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    handlers = [console_handler]
    
    # Only add file logging if in local environment (Vercel has read-only FS)
    if settings.ENVIRONMENT == "local":
        # Ensure logs directory exists
        log_dir = "logs"
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        
        log_file = os.path.join(log_dir, "app.log")
        file_handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=5)
        file_handler.setFormatter(formatter)
        handlers.append(file_handler)
    
    # Reset any existing handlers
    root_logger = logging.getLogger()
    for h in root_logger.handlers[:]:
        root_logger.removeHandler(h)
        
    logging.basicConfig(
        level=logging.INFO,
        handlers=handlers
    )
    
    # Set levels for noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("python_multipart").setLevel(logging.WARNING)

# Removed setup_logging() call from here - it's called in app/main.py
logger = logging.getLogger("app")
