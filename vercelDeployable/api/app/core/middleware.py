from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from jose import jwt, JWTError
from sqlalchemy import select
from app.core.config import get_settings
from app.core.database import AsyncSessionLocal
from app.features.auth.models import User
from app.features.auth.schemas import TokenData

settings = get_settings()
import logging
logger = logging.getLogger(__name__)

class AuthenticationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Check for Bypass/Exception Routes
        path = request.url.path
        if any(path.startswith(route) for route in settings.EXCEPTION_ROUTES):
            logger.debug(f"Bypassing authentication for path: {path}")
            return await call_next(request)
        
        # 2. Extract Token
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            logger.warning(f"Authentication failed: Missing or invalid token for path {path}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Not authenticated"}
            )
        
        token = auth_header.split(" ")[1]
        
        # 3. Validate Token & User
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                raise JWTError
            token_data = TokenData(email=email)
        except JWTError:
            logger.warning(f"Authentication failed: Invalid token for path {path}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Could not validate credentials"}
            )
            
        # 4. DB Lookup (Scoped Session)
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User).where(User.email == token_data.email))
            user = result.scalar_one_or_none()
            
            if not user:
                logger.warning(f"Authentication failed: User {token_data.email} not found")
                return JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={"detail": "User not found"}
                )
            
            # Attach user to request state
            request.state.user = user
            logger.debug(f"User {user.email} authenticated successfully for {path}")
            
            try:
                response = await call_next(request)
                logger.info(f"Response: {response.status_code} for {path}")
                return response
            except Exception as e:
                logger.error(f"Error in middleware processing {path}: {e}", exc_info=True)
                return JSONResponse(
                    status_code=500,
                    content={"detail": "Internal Server Error in Middleware", "msg": str(e)}
                )
