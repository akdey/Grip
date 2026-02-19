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

@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} - The financial diet that sticks."}
