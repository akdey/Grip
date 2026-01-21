from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

import ssl

# Handle potential missing DATABASE_URL for build/test environments
db_url = settings.ASYNC_DATABASE_URL
if not db_url:
    # Use a dummy in-memory sqlite for build context or warn
    print("WARNING: DATABASE_URL not set. Using in-memory SQLite for startup safety.")
    db_url = "sqlite+aiosqlite:///:memory:"

# Create a custom SSL context that ignores certificate verification
# This is often needed for cloud databases (Render, Neon, etc.) where certs might be self-signed or internal
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

try:
    connect_args = {}
    if "sqlite" in db_url:
        connect_args = {"check_same_thread": False}
    else:
        connect_args = {
            "statement_cache_size": 0,
            "server_settings": {
                "application_name": "grip_backend"
            },
        }
        # Only enforce SSL if we are NOT in a local environment OR if we detect a Cloud database URL (Render, Supabase, etc)
        # This prevents connection timeouts on Cloud DBs (which need SSL) while keeping it off for localhost
        if settings.ENVIRONMENT != "local" or "render.com" in db_url or "dpg-" in db_url or "supabase" in db_url:
            connect_args["ssl"] = ssl_context

    engine = create_async_engine(
        db_url, 
        echo=False,
        pool_pre_ping=True, # Re-enabling to ensure connections are valid
        pool_recycle=300, 
        pool_size=5, # Increased to handle concurrency better
        max_overflow=10, # Allow more temporary burst connections
        connect_args=connect_args
    )
except Exception as e:
    print(f"CRITICAL: Failed to create database engine: {e}")
    raise e

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
