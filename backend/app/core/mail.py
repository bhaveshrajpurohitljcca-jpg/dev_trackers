import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

def send_email_smtp(recipient_email: str, subject: str, body: str) -> bool:
    # Check if SMTP settings are configured
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"SMTP credentials not configured. Mock logging email to {recipient_email}")
        return False
        
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_USER
        msg['To'] = recipient_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect to server
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        server.starttls()  # Upgrade connection to secure TLS
        
        # Login
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        
        # Send
        server.sendmail(settings.SMTP_USER, recipient_email, msg.as_string())
        server.quit()
        
        logger.info(f"Email successfully sent to {recipient_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {str(e)}")
        return False
