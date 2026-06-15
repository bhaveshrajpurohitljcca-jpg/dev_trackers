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
) -> tuple[bool, str]:
    # Resolve SMTP configurations (db settings or environment variables fallback)
    host = smtp_host or settings.SMTP_HOST
    port = smtp_port or settings.SMTP_PORT or 587
    user = smtp_user or settings.SMTP_USER
    password = smtp_password or settings.SMTP_PASSWORD

    # Force IPv4 resolution to bypass IPv6 'Network is unreachable' errors on hosts (like Render)
    original_host = host
    import socket
    try:
        addr_info = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
        if addr_info:
            # Use the first IPv4 address returned
            host = addr_info[0][4][0]
            logger.info(f"Forced IPv4 resolution: resolved {original_host} to {host}")
    except Exception as dns_err:
        logger.warning(f"Could not force IPv4 resolution for {original_host}: {dns_err}")

    # Check if SMTP settings are configured
    if not user or not password:
        err = "SMTP credentials not configured"
        logger.warning(f"{err}. Mock logging email to {recipient_email}")
        return False, err
        
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = user
        msg['To'] = recipient_email
        msg['Subject'] = subject
        
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect and send
        import ssl
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE

        if port == 465:
            logger.info(f"Connecting to SMTP SSL server {host}:{port} with 10s timeout...")
            server = smtplib.SMTP_SSL(host, port, timeout=10, context=context)
        else:
            logger.info(f"Connecting to SMTP server {host}:{port} with 10s timeout...")
            server = smtplib.SMTP(host, port, timeout=10)
            try:
                server.starttls(context=context)  # Upgrade connection to secure TLS
            except Exception as tls_err:
                logger.warning(f"STARTTLS failed or not supported: {str(tls_err)}")
        
        # Login
        server.login(user, password)
        
        # Send
        server.sendmail(user, recipient_email, msg.as_string())
        server.quit()
        
        logger.info(f"Email successfully sent to {recipient_email}")
        return True, "Sent"
    except Exception as e:
        err_msg = str(e)
        logger.error(f"Failed to send email to {recipient_email}: {err_msg}")
        return False, err_msg
