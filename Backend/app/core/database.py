from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

# Handle potential missing DATABASE_URL for build/test environments
db_url = settings.ASYNC_DATABASE_URL
if not db_url:
    # Use a dummy in-memory sqlite for build context or warn
    print("WARNING: DATABASE_URL not set. Using in-memory SQLite for startup safety.")
    db_url = "sqlite+aiosqlite:///:memory:"

try:
    engine = create_async_engine(
        db_url, 
        echo=False,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
        connect_args={"check_same_thread": False} if "sqlite" in db_url else {
            "statement_cache_size": 0,
            "server_settings": {
                "application_name": "grip_backend"
            }
        }
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
