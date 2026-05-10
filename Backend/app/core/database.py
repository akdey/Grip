from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.core.config import get_settings
import ssl

settings = get_settings()

# Handle missing DATABASE_URL
db_url = settings.ASYNC_DATABASE_URL
if not db_url:
    print("WARNING: DATABASE_URL not set. Using in-memory SQLite.")
    db_url = "sqlite+aiosqlite:///:memory:"

# Initialize engine
engine = None

try:
    connect_args = {}
    poolclass = None
    
    if "sqlite" in db_url:
        connect_args = {"check_same_thread": False}
    else:
        # PostgreSQL configuration
        connect_args = {
            "statement_cache_size": 0,  # Required for Supabase pooler
            "server_settings": {"application_name": "grip_backend"},
            "timeout": 20,
            "command_timeout": 20
        }
        
        # Supabase-specific configuration
        if "supabase" in db_url.lower():
            # Use NullPool for Supabase Transaction Pooler (port 6543)
            if ":6543" in db_url:
                poolclass = NullPool
            
            # Permissive SSL context for Supabase
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            connect_args["ssl"] = ssl_context

    # Create engine
    engine_kwargs = {"echo": False, "connect_args": connect_args}
    
    if poolclass is NullPool:
        engine_kwargs["poolclass"] = NullPool
    else:
        engine_kwargs.update({
            "pool_pre_ping": True,
            "pool_recycle": 300,
            "pool_size": 10,
            "max_overflow": 20,
        })
    
    engine = create_async_engine(db_url, **engine_kwargs)
    
except Exception as e:
    print(f"CRITICAL: Failed to create database engine: {e}")
    import traceback
    traceback.print_exc()
    # Fallback to SQLite
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", poolclass=NullPool)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

# Base model
class Base(DeclarativeBase):
    pass

# Dependency
async def get_db():
    import time
    import logging
    logger = logging.getLogger("app.core.database")
    
    start_t = time.perf_counter()
    async with AsyncSessionLocal() as session:
        db_init_time = (time.perf_counter() - start_t) * 1000
        logger.info(f"DB_PERF: Session initialized in {db_init_time:.2f}ms")
        yield session
