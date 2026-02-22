from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import logging

from app.core.config import get_settings
from app.core.database import engine, Base
from app.core.logging_config import setup_logging
from app.core.middleware import AuthenticationMiddleware

from app.features.auth.router import router as auth_router
from app.features.transactions.router import router as transactions_router
from app.features.sync.router import router as sync_router
from app.features.dashboard.router import router as dashboard_router
from app.features.credit_cards.router import router as credit_cards_router
from app.features.bills.router import router as bills_router
from app.features.analytics.router import router as analytics_router

from app.features.categories.router import router as categories_router
from app.features.goals.router import router as goals_router
from app.features.export.router import router as export_router
from app.features.wealth.router import router as wealth_router
from app.features.sync.models import SyncLog 

setup_logging()
logger = logging.getLogger(__name__)
settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Database Table Creation
    try:
        if settings.ENVIRONMENT in ["local", "development", "production"]:
            logger.info(f"Environment: {settings.ENVIRONMENT}. Ensuring tables...")
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        else:
            logger.info(f"Environment: {settings.ENVIRONMENT}. Skipping table creation.")
    except Exception as e:
        logger.error(f"Startup Database Error: {str(e)}")
        logger.exception("Full traceback:")  # This will log the full stack trace

    # Start Scheduler
    from app.core.scheduler import start_scheduler
    try:
        start_scheduler()
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")
        
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)
#app.router.redirect_slashes = False
app.add_middleware(AuthenticationMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "msg": str(exc)},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(transactions_router, prefix=f"{settings.API_V1_STR}/transactions", tags=["transactions"])
app.include_router(sync_router, prefix=f"{settings.API_V1_STR}/sync", tags=["sync"])
app.include_router(dashboard_router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["dashboard"])
app.include_router(credit_cards_router, prefix=f"{settings.API_V1_STR}/credit-cards", tags=["credit-cards"])
app.include_router(bills_router, prefix=f"{settings.API_V1_STR}/bills", tags=["bills"])
app.include_router(analytics_router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])
app.include_router(categories_router, prefix=f"{settings.API_V1_STR}/categories", tags=["categories"])
app.include_router(goals_router, prefix=f"{settings.API_V1_STR}/goals", tags=["goals"])
app.include_router(wealth_router, prefix=f"{settings.API_V1_STR}/wealth", tags=["wealth"])
app.include_router(export_router, prefix=f"{settings.API_V1_STR}/export", tags=["export"])

from fastapi.responses import HTMLResponse, FileResponse
import os

@app.get("/", tags=["status"])
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "engine": "Grip Intelligence Engine 1.0",
        "status": "Operational",
        "privacy_policy": "/privacy",
        "terms_of_service": "/terms",
        "author": "Amit Kumar Dey"
    }

@app.get("/privacy", response_class=HTMLResponse, tags=["legal"])
async def privacy_policy():
    static_path = os.path.join(os.path.dirname(__file__), "..", "static", "privacy.html")
    if os.path.exists(static_path):
        return FileResponse(static_path)
    return HTMLResponse("<h1>Privacy Policy</h1><p>Grip Intelligence Privacy Policy is being updated.</p>")

@app.get("/terms", response_class=HTMLResponse, tags=["legal"])
async def terms_of_service():
    static_path = os.path.join(os.path.dirname(__file__), "..", "static", "terms.html")
    if os.path.exists(static_path):
        return FileResponse(static_path)
    return HTMLResponse("<h1>Terms of Service</h1><p>Grip Intelligence Terms of Service are being updated.</p>")


import socket

def check_port(host, port, timeout=5):
    try:
        # Create a TCP socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        # connect_ex returns 0 if the connection is successful
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            return f"✅ Port {port} is OPEN on {host}"
        else:
            return f"❌ Port {port} is CLOSED or BLOCKED (Error code: {result})"
    except Exception as e:
        return f"⚠️ Error checking port {port}: {e}"

# Test Gmail SMTP ports
print(check_port("smtp.gmail.com", 587))
print(check_port("smtp.gmail.com", 465))
print(check_port("smtp.gmail.com", 25))