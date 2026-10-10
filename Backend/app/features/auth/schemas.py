from typing import Optional
from pydantic import BaseModel, EmailStr
import uuid

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    is_active: Optional[bool] = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: uuid.UUID
    
    class Config:
        from_attributes = True

class PasswordVerification(BaseModel):
    password: str

class VerifyOTP(BaseModel):
    email: EmailStr
    otp: str

class EmergencyContactUpdate(BaseModel):
    emergency_contact_email: Optional[EmailStr] = None

class EmergencyContactResponse(BaseModel):
    emergency_contact_email: Optional[str] = None
    last_active_at: Optional[str] = None

