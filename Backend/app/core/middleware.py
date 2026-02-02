from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from jose import jwt, JWTError
from app.core.config import get_settings

settings = get_settings()
import logging
logger = logging.getLogger(__name__)

class AuthenticationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Check for Bypass/Exception Routes
        path = request.url.path
        is_exception = False
        for route in settings.EXCEPTION_ROUTES:
            if route == "/":
                if path == "/":
                    is_exception = True
                    break
            elif path.startswith(route):
                is_exception = True
                break
        
        if is_exception:
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
        
        # 3. Validate Token
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            email: str = payload.get("sub")
            if email is None:
                raise JWTError
        except JWTError:
            logger.warning(f"Authentication failed: Invalid token for path {path}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Could not validate credentials"}
            )
            
        # 4. Stateless Authentication
        # We trust the token signature. We do NOT hit the DB here.
        # Downstream dependencies (get_current_user) will fetch the full user object if needed.
        request.state.user_email = email
        # logger.debug(f"Token valid for {email}, proceeding statelessly for {path}")
        
        # 5. Process request
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

