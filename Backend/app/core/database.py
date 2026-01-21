from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.core.config import get_settings

settings = get_settings()

import ssl

# Handle potential missing DATABASE_URL for build/test environments
db_url = settings.ASYNC_DATABASE_URL
if not db_url:
    # Use a dummy in-memory sqlite for build context or warn
    print("WARNING: DATABASE_URL not set. Using in-memory SQLite for startup safety.")
    db_url = "sqlite+aiosqlite:///:memory:"

# For Supabase pooler (PgBouncer), we need to use 'require' mode instead of custom SSL context
# This avoids certificate verification issues while still using SSL
# We'll set this via connection parameters instead of a custom context

# Initialize engine variable
engine = None

try:
    connect_args = {}
    poolclass = None  # Default to SQLAlchemy's pooling
    
    if "sqlite" in db_url:
        connect_args = {"check_same_thread": False}
    else:
        connect_args = {
            "statement_cache_size": 0,  # Critical for Supabase pooler - disables prepared statements
            "server_settings": {
                "application_name": "grip_backend"
            },
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

        # Supabase Specific Configuration
        if "supabase" in url_str:
            # Check if using Transaction Pooler (port 6543)
            if ":6543" in url_str:
                print("DATABASE: Detected Supabase Transaction Pooler (Port 6543)")
                print("   -> Using NullPool (no SQLAlchemy pooling) - Supabase pooler handles connections")
                poolclass = NullPool  # Critical: Let Supabase handle pooling
            elif ":5432" in url_str:
                print("WARNING: Detected Supabase usage on Port 5432.")
                print("   -> If you are on the Supabase Free Tier, direct IPv4 connections to port 5432 might be blocked.")
                print("   -> Render uses IPv4. Switch to the Transaction Pooler (Port 6543).")
            
            # For Supabase with asyncpg, use ssl=True (not 'require' string)
            # asyncpg will use default SSL context which works with Supabase
            print(f"DATABASE: Configuring SSL for Supabase (ssl=True)")
            connect_args["ssl"] = True
        elif use_ssl:
            print(f"DATABASE: Enforcing SSL for {settings.ENVIRONMENT} (Target: Cloud/Remote)")
            # For other cloud providers, use a permissive SSL context
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            connect_args["ssl"] = ssl_context
        else:
            print(f"DATABASE: SSL Disabled for {settings.ENVIRONMENT} (Target: Local/Dev)")

        # Timeout Settings
        connect_args["timeout"] = 20
        connect_args["command_timeout"] = 20

    # Create engine with appropriate pooling strategy
    engine_kwargs = {
        "echo": False,
        "connect_args": connect_args
    }
    
    # Only add pooling params if NOT using NullPool (i.e., not Supabase Transaction Mode)
    if poolclass is NullPool:
        engine_kwargs["poolclass"] = NullPool
    else:
        engine_kwargs.update({
            "pool_pre_ping": True,
            "pool_recycle": 300,
            "pool_size": 10,
            "max_overflow": 20,
        })
    
    print(f"DATABASE: Creating engine with config: poolclass={poolclass}, ssl={connect_args.get('ssl', 'None')}")
    engine = create_async_engine(db_url, **engine_kwargs)
    print("DATABASE: Engine created successfully")
except Exception as e:
    print(f"CRITICAL: Failed to create database engine: {e}")
    import traceback
    traceback.print_exc()
    # Create a dummy engine for SQLite to allow app to start
    print("DATABASE: Falling back to in-memory SQLite")
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", poolclass=NullPool)

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
