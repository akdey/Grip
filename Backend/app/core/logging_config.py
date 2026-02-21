import logging
import sys
import os
from logging.handlers import RotatingFileHandler

from app.core.config import get_settings

# Configure basic logging to output to console and file
def setup_logging():
    settings = get_settings()
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # Handlers
    console_handler = logging.StreamHandler(sys.stdout)
    handlers = [console_handler]
    
    # Only add file logging if in local environment (Vercel has read-only FS)
    if settings.ENVIRONMENT == "local":
        # Ensure logs directory exists
        log_dir = "logs"
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        
        log_file = os.path.join(log_dir, "app.log")
        file_handler = RotatingFileHandler(log_file, maxBytes=5*1024*1024, backupCount=5)
        handlers.append(file_handler)
    
    logging.basicConfig(
        level=logging.INFO,
        format=log_format,
        handlers=handlers
    )
    # Set levels for noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("python_multipart").setLevel(logging.WARNING)

# Removed setup_logging() call from here - it's called in app/main.py
logger = logging.getLogger("app")
