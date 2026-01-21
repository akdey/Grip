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
        }
        
        # Robust SSL Detection Logic
        # 1. Default to NO SSL
        use_ssl = False
        
        # 2. Check for known Cloud Providers (Supabase, Render, Neon, etc.)
        # These ALWAYS require SSL, regardless of 'ENVIRONMENT' variable
        url_str = db_url.lower()
        cloud_domains = ["supabase", "render.com", "neon.tech", "aws.com", "azure.com", "dpg-"]
        is_cloud_db = any(domain in url_str for domain in cloud_domains)

        # 3. Check for Localhost/SQLite
        is_local = "localhost" in url_str or "127.0.0.1" in url_str or "sqlite" in url_str

        # 4. Determine final state
        # If it's a cloud DB, OR if we are in production/non-local env (and it's not explicitly localhost)
        if is_cloud_db or (settings.ENVIRONMENT != "local" and not is_local):
            use_ssl = True

        if use_ssl:
            print("DATABASE: Enforcing SSL (Cloud/Production DB detected)")
            connect_args["ssl"] = ssl_context
        else:
            print("DATABASE: SSL Disabled (Local/Dev DB detected)")

        # Add timeouts to prevent indefinite hangs
        connect_args["timeout"] = 30
        connect_args["command_timeout"] = 30

    engine = create_async_engine(
        db_url, 
        echo=False,
        pool_pre_ping=True, 
        pool_recycle=300, 
        pool_size=10, 
        max_overflow=20, 
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
