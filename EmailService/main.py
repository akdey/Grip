from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel, EmailStr
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import base64
import os
from typing import Optional, List

app = FastAPI(title="Grip Email Relay")

# This secret should be shared between your main backend and this microservice
EMAIL_RELAY_SECRET = os.getenv("EMAIL_RELAY_SECRET", "change-me-in-production")

class EmailAttachment(BaseModel):
    filename: str
    content: str  # Base64-encoded string
    type: Optional[str] = "application/octet-stream"

class EmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    html_content: str
    from_name: Optional[str] = "Grip"
    attachments: Optional[List[EmailAttachment]] = None

@app.get("/")
def read_root():
    return {"status": "Grip Email Relay Operational"}

@app.post("/send")
async def send_email(
    request: EmailRequest,
    x_grip_secret: Optional[str] = Header(None)
):
    if x_grip_secret != EMAIL_RELAY_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized relay request")

    # Get SMTP settings from env (Vercel env variables)
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    from_email = os.getenv("FROM_EMAIL", user)

    if not user or not password:
        raise HTTPException(status_code=500, detail="Relay SMTP credentials missing")

    try:
        if request.attachments:
            # When attachments are present, use 'mixed' multipart
            message = MIMEMultipart("mixed")
            message["Subject"] = request.subject
            message["From"] = f"{request.from_name} <{from_email}>"
            message["To"] = request.to_email

            # Attach HTML Body
            body_part = MIMEText(request.html_content, "html")
            message.attach(body_part)

            # Process and attach each file
            for att in request.attachments:
                try:
                    file_bytes = base64.b64decode(att.content)
                    mime_type = att.type or "application/octet-stream"
                    if "/" in mime_type:
                        maintype, subtype = mime_type.split("/", 1)
                    else:
                        maintype, subtype = "application", "octet-stream"
                    
                    part = MIMEBase(maintype, subtype)
                    part.set_payload(file_bytes)
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f'attachment; filename="{att.filename}"'
                    )
                    message.attach(part)
                except Exception as att_err:
                    print(f"Error attaching {att.filename}: {att_err}")
        else:
            message = MIMEMultipart("alternative")
            message["Subject"] = request.subject
            message["From"] = f"{request.from_name} <{from_email}>"
            message["To"] = request.to_email
            message.attach(MIMEText(request.html_content, "html"))

        # Since Vercel is often liberal with ports, we try standard 587
        # or 465 based on what you configure in environment.
        if port == 465:
            with smtplib.SMTP_SSL(host, port) as server:
                server.login(user, password)
                server.sendmail(from_email, request.to_email, message.as_string())
        else:
            with smtplib.SMTP(host, port) as server:
                server.starttls()
                server.login(user, password)
                server.sendmail(from_email, request.to_email, message.as_string())
        
        return {"status": "sent"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

