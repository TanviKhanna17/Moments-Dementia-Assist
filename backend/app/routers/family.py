from typing import List

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from sqlalchemy.orm import Session

from app.schemas import schemas
from app.services import auth_service, family_service

router = APIRouter(
    prefix="/family",
    tags=["family"],
    dependencies=[Depends(auth_service.get_current_active_user)],
    responses={404: {"description": "Not found"}},
)


@router.post("/members/", response_model=schemas.FamilyMember)
def create_family_member(
    member: schemas.FamilyMemberCreate,
    db: Session = Depends(auth_service.get_db),
    current_user: schemas.User = Depends(auth_service.get_current_active_user),
):
    """
    Create a new family member for the current user.
    """
    return family_service.create_family_member(db=db, member=member, user_id=current_user.id)


@router.get("/members/", response_model=List[schemas.FamilyMember])
def read_family_members(
    db: Session = Depends(auth_service.get_db),
    current_user: schemas.User = Depends(auth_service.get_current_active_user),
):
    """
    Retrieve all family members for the current user.
    """
    members = family_service.get_family_members_by_user(db, user_id=current_user.id)
    return members


@router.delete("/members/{member_id}")
def delete_family_member(
    member_id: int,
    db: Session = Depends(auth_service.get_db),
    current_user: schemas.User = Depends(auth_service.get_current_active_user),
):
    """
    Delete a family member and all associated photos.
    """
    return family_service.delete_family_member(db=db, member_id=member_id, user_id=current_user.id)


@router.post("/members/{member_id}/photos", response_model=schemas.Image)
async def upload_family_member_photo(
    member_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(auth_service.get_db),
    current_user: schemas.User = Depends(auth_service.get_current_active_user),
):
    """
    Upload a photo for a specific family member.
    The photo will be validated to ensure a face is present.
    """
    return await family_service.save_photo_for_member(
        db=db, user_id=current_user.id, member_id=member_id, file=file
    )
