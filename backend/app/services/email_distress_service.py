import smtplib
from email.message import EmailMessage
from typing import Optional
from app.core.config import settings
import json
import requests


class EmailDistressService:
    def __init__(self):
        self.from_email = settings.SMTP_FROM_EMAIL
        # Prefer SendGrid HTTP API if configured (works over HTTPS 443)
        self.use_sendgrid = bool(getattr(settings, "SENDGRID_API_KEY", ""))
        if not self.use_sendgrid:
            # Fall back to SMTP; require SMTP configuration
            if not (settings.SMTP_HOST and settings.SMTP_USERNAME and settings.SMTP_PASSWORD and settings.SMTP_FROM_EMAIL):
                raise ValueError(
                    "Email configuration missing. Set SENDGRID_API_KEY or SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD/SMTP_FROM_EMAIL."
                )
            self.host = settings.SMTP_HOST
            self.port = settings.SMTP_PORT or 465
            self.username = settings.SMTP_USERNAME
            self.password = settings.SMTP_PASSWORD

    def send_email(self, to_email: str, subject: str, body: str):
        if self.use_sendgrid:
            # Send via SendGrid HTTP API
            api_key = settings.SENDGRID_API_KEY
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": self.from_email or to_email},
                "subject": subject,
                "content": [{"type": "text/plain", "value": body}],
            }
            resp = requests.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers=headers,
                data=json.dumps(payload),
                timeout=20,
            )
            if resp.status_code >= 400:
                raise RuntimeError(f"SendGrid error {resp.status_code}: {resp.text}")
            return

        # SMTP path
        msg = EmailMessage()
        msg["From"] = self.from_email
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.set_content(body)
        if self.port == 465:
            with smtplib.SMTP_SSL(self.host, self.port) as server:
                server.login(self.username, self.password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(self.host, self.port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)


