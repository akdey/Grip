from fastapi import Request, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.features.auth.models import User
from app.core.database import get_db

import time

# Global in-memory user and activity cache
_user_cache = {} # email -> (user_obj, timestamp)
USER_CACHE_TTL = 600 # 10 minutes

_user_activity_cache = {} # email -> timestamp
USER_ACTIVITY_INTERVAL = 7200 # 2 hours

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
    user = None
    if email in _user_cache:
        cached_user, expiry = _user_cache[email]
        if now < expiry:
            user = cached_user
    
    # 4. Fetch User from DB (Cache Miss)
    if not user:
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

        # Update Global Cache
        _user_cache[email] = (user, now + USER_CACHE_TTL)

    # 5. Throttled activity timestamp tracking (ZERO-bloat, at most once per 2 hours)
    last_touch = _user_activity_cache.get(email, 0)
    if now - last_touch > USER_ACTIVITY_INTERVAL:
        _user_activity_cache[email] = now
        try:
            from datetime import datetime, timezone
            from sqlalchemy import update
            await db.execute(
                update(User)
                .where(User.id == user.id)
                .values(last_active_at=datetime.now(timezone.utc))
            )
            await db.commit()
            user.last_active_at = datetime.now(timezone.utc)
        except Exception:
            pass

    request.state.user = user
    return user
