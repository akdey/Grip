from fastapi import Request, HTTPException, status
from app.features.auth.models import User

# Replaced old heavy logic with lightweight state access
def get_current_user(request: Request) -> User:
    if not hasattr(request.state, "user"):
        # This shouldn't be reached if middleware works correctly, 
        # but serves as a failsafe for code using this dependency on public routes.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    return request.state.user
