from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.features.auth.models import User
from app.core.database import get_db

import time

# Global in-memory user cache
_user_cache = {} # email -> (user_obj, timestamp)
USER_CACHE_TTL = 600 # 10 minutes

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    # 1. Check if user is already attached to this specific request
    if hasattr(request.state, "user") and request.state.user:
        return request.state.user

    # 2. Check for email claim from stateless middleware
    email = getattr(request.state, "user_email", None)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # 3. Check Global Memory Cache
    now = time.time()
    if email in _user_cache:
        user, expiry = _user_cache[email]
        if now < expiry:
            request.state.user = user
            return user
    
    # 4. Fetch User from DB (Cache Miss)
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
        
    if not user.is_active:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    # 5. Update Global Cache
    _user_cache[email] = (user, now + USER_CACHE_TTL)
    request.state.user = user
    return user
