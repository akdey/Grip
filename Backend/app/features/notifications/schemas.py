from pydantic import BaseModel, Field

class FCMTokenUpdate(BaseModel):
    token: str = Field(..., description="Firebase Cloud Messaging registration token")
