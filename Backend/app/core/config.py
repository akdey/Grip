from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    PROJECT_NAME: str = "Grip"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "local"
    APP_TIMEZONE: str = "Asia/Kolkata"  # Default to IST
    
    DATABASE_URL: str = ""
    
    SECRET_KEY: str = "SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 3  # 3 days
    GRIP_SECRET: str = "GripSecret"
    
    EXCEPTION_ROUTES: list[str] = [
        "/docs", 
        "/redoc", 
        "/openapi.json", 
        "/api/v1/openapi.json",
        "/api/v1/auth/register", 
        "/api/v1/auth/verify-otp",
        "/api/v1/auth/token",
        "/api/v1/sync/webhook"
    ]
    
    USE_AI_FORECASTING: bool = True
    ENABLE_SCHEDULER: bool = True  # Set to False when using external cron (e.g., GitHub Actions)
    
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    FRONTEND_ORIGIN: str = "http://localhost:5173"  # Frontend URL for OAuth origin parameter
    GOOGLE_REDIRECT_URI: str = "postmessage"
    
    # Firebase Settings
    FIREBASE_CREDENTIALS_PATH: str = "firebase_credentials.json"
    
    
    # Email Settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "noreply@grip.com"
    FROM_NAME: str = "Grip"
    
    # Branding
    APP_NAME: str = "Grip"
    APP_TAGLINE: str = "Spend smart, stress less."
    
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
