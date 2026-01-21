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
        
        # Robust SSL/Connection Logic
        url_str = db_url.lower()
        use_ssl = False
        
        # Detect Cloud Providers
        cloud_domains = ["supabase", "render.com", "neon.tech", "aws.com", "azure.com", "dpg-"]
        is_cloud_db = any(domain in url_str for domain in cloud_domains)
        is_local = "localhost" in url_str or "127.0.0.1" in url_str or "sqlite" in url_str

        # Determine SSL requirement
        if is_cloud_db or (settings.ENVIRONMENT != "local" and not is_local):
            use_ssl = True

        # Supabase Specific Check for Port 5432 (IPv4 Deprecation issue on Free Tier)
        if "supabase" in url_str and ":5432" in url_str:
            print("WARNING: Detected Supabase usage on Port 5432.")
            print("   -> If you are on the Supabase Free Tier, direct IPv4 connections to port 5432 might be blocked.")
            print("   -> Render uses IPv4. If you experience timeouts, switch to the Transaction Pooler (Port 6543).")

        if use_ssl:
            print(f"DATABASE: Enforcing SSL for {settings.ENVIRONMENT} (Target: Cloud/Remote)")
            # Create a permissive SSL context associated with the context settings
            # This is critical for avoiding hostname mismatches on some cloud load balancers
            connect_args["ssl"] = ssl_context
        else:
            print(f"DATABASE: SSL Disabled for {settings.ENVIRONMENT} (Target: Local/Dev)")

        # Timeout Settings
        connect_args["timeout"] = 20
        connect_args["command_timeout"] = 20

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
    # Don't raise here, let the app start so logs can be seen, but DB will fail later
    pass

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    if engine is None:
        raise Exception("Database engine not initialized")
    async with AsyncSessionLocal() as session:
        yield session
