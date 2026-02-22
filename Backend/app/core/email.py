import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)

import httpx

def send_email(to_email: str, subject: str, html_content: str):
    """
    Sends an email using either a Vercel Microservice relay (Approach C)
    or standard SMTP if configured.
    """
    # External Relay (Recommended for cloud hosting like HF Spaces as required ports are blocked)
    if settings.EMAIL_RELAY_URL and settings.EMAIL_RELAY_SECRET:
        try:
            payload = {
                "to_email": to_email,
                "subject": subject,
                "html_content": html_content,
                "from_name": settings.FROM_NAME
            }
            headers = {"X-Grip-Secret": settings.EMAIL_RELAY_SECRET}
            
            # Using synchronous request for simplicity in background tasks, 
            # though async is generally better.
            with httpx.Client() as client:
                resp = client.post(settings.EMAIL_RELAY_URL, json=payload, headers=headers, timeout=15.0)
                if resp.status_code == 200:
                    return True
                else:
                    logger.error(f"Relay failed ({resp.status_code}): {resp.text}")
                    return False
        except Exception as e:
            logger.error(f"Relay connection error: {e}")
            return False

    # --- LEGACY DIRECT SMTP (Approach A/B) ---
    # NOTE: DO NOT REMOVE THIS BLOCK. 
    # Standard SMTP (Port 587/465) is frequently blocked on cloud providers like HF Spaces.
    # If using approach above, this code remains here as an alternative for local development.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP credentials not set. Email not sent.")
        return False

    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>"
        message["To"] = to_email

        part = MIMEText(html_content, "html")
        message.attach(part)

        # Use SMTP_SSL for port 465, otherwise standard SMTP + starttls
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.FROM_EMAIL, to_email, message.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.FROM_EMAIL, to_email, message.as_string())
        
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False
    """
    logger.warning("No email relay or SMTP configured accurately.")
    return False

def send_otp_email(to_email: str, otp: str):
    subject = f"Your {settings.APP_NAME} Verification Code: {otp}"
    html_content = f"""
    <html>
        <body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 20px; background-color: #f8fafc;">
            <div style="max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
                <div style="margin-bottom: 30px; text-align: left;">
                    <span style="font-size: 24px; font-weight: 900; letter-spacing: -0.02em; color: #111;">GRIP</span>
                    <div style="height: 4px; width: 40px; background: #4F46E5; margin-top: 4px; border-radius: 2px;"></div>
                </div>
                
                <h2 style="color: #111; margin-top: 0; font-size: 22px; font-weight: 800;">Verify your email</h2>
                <p style="color: #475569; font-size: 16px;">Welcome! Please use the verification code below to complete your sign-in to {settings.APP_NAME}.</p>
                
                <div style="background: #f1f5f9; padding: 30px; border-radius: 12px; margin: 25px 0; text-align: center; border: 1px solid #e2e8f0;">
                    <span style="font-size: 36px; font-weight: 900; letter-spacing: 12px; color: #111; font-family: monospace; display: block; margin-left: 12px;">{otp}</span>
                </div>
                
                <p style="font-size: 14px; color: #94a3b8; text-align: center;">This code will expire in 10 minutes.</p>
                
                <div style="margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px;">
                    <p style="font-size: 14px; color: #64748b; margin: 0;">Stay focused,</p>
                    <p style="font-size: 14px; font-weight: bold; color: #111; margin: 4px 0;">The {settings.APP_NAME} Team</p>
                </div>
            </div>
            <div style="max-width: 500px; margin: 10px auto; text-align: center;">
                <p style="font-size: 11px; color: #94a3b8;">If you didn't request this code, you can safely ignore this email.</p>
            </div>
        </body>
    </html>
    """
    return send_email(to_email, subject, html_content)
