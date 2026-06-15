import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_email_smtp(
    recipient_email: str, 
    subject: str, 
    body: str,
    smtp_host: Optional[str] = None,
    smtp_port: Optional[int] = None,
    smtp_user: Optional[str] = None,
    smtp_password: Optional[str] = None
) -> bool:
    # Resolve SMTP configurations (db settings or environment variables fallback)
    host = smtp_host or settings.SMTP_HOST
    port = smtp_port or settings.SMTP_PORT or 587
    user = smtp_user or settings.SMTP_USER
    password = smtp_password or settings.SMTP_PASSWORD

    # Check if SMTP settings are configured
    if not user or not password:
        logger.warning(f"SMTP credentials not configured. Mock logging email to {recipient_email}")
        return False
        
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = user
        msg['To'] = recipient_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect to server
        server = smtplib.SMTP(host, port)
        server.starttls()  # Upgrade connection to secure TLS
        
        # Login
        server.login(user, password)
        
        # Send
        server.sendmail(user, recipient_email, msg.as_string())
        server.quit()
        
        logger.info(f"Email successfully sent to {recipient_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {str(e)}")
        return False
