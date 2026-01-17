from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "Griply"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "local"
    
    DATABASE_URL: str = ""
    
    SECRET_KEY: str = "SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 3  # 3 days
    GRIPLY_SECRET: str = "GriplySecret"
    
    EXCEPTION_ROUTES: list[str] = [
        "/docs", 
        "/redoc", 
        "/openapi.json", 
        "/api/v1/openapi.json",
        "/api/v1/auth/register", 
        "/api/v1/auth/token",
        "/api/v1/sync/webhook"
    ]
    
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama3-8b-8192"
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        
        if "pgbouncer=true" in url:
            url = url.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")
            
        return url

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

@lru_cache()
def get_settings():
    return Settings()
