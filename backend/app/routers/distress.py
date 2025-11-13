from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel, Field
from app.core.config import settings
from app.services.auth_service import get_current_user
from app.models.models import User
from app.services.email_distress_service import EmailDistressService

router = APIRouter(prefix="/distress", tags=["distress"])


class DistressEmailRequest(BaseModel):
    email: str = Field(..., description="Recipient email address")
    contact_name: str | None = None
    message_override: str | None = None


class DistressEmailResponse(BaseModel):
    success: bool
    message: str


@router.post("/email", response_model=DistressEmailResponse)
async def trigger_distress_email(
    payload: DistressEmailRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Send a distress email via SMTP to the specified address.
    """
    try:
        template = settings.DISTRESS_MESSAGE_TEMPLATE or "This is an automated distress notification."
        username = getattr(current_user, "username", "the user")
        base_message = template.format(username=username)
        final_message = payload.message_override.strip() if payload.message_override else base_message

        subject = f"Distress Alert for {username}"
        service = EmailDistressService()
        service.send_email(payload.email, subject, final_message)
        return DistressEmailResponse(success=True, message="Distress email sent")
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send distress email: {e}",
        )


