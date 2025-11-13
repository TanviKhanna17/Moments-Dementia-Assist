import os
import shutil
import uuid
from pathlib import Path

# from deepface import DeepFace  # Temporarily commented out
from fastapi import File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models import models
from app.schemas import schemas

# Define the base directory for uploads relative to the current file
# This ensures it works correctly regardless of where the app is run from
UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)


def get_family_member(db: Session, member_id: int, user_id: int):
    """
    Retrieves a single family member by ID, ensuring they belong to the user.
    """
    member = (
        db.query(models.FamilyMember)
        .filter(models.FamilyMember.id == member_id, models.FamilyMember.user_id == user_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Family member not found")
    return member


def get_family_members_by_user(db: Session, user_id: int):
    """
    Retrieves all family members associated with a specific user.
    """
    return db.query(models.FamilyMember).filter(models.FamilyMember.user_id == user_id).all()


def create_family_member(db: Session, member: schemas.FamilyMemberCreate, user_id: int):
    """
    Creates a new family member record in the database for the given user.
    """
    db_member = models.FamilyMember(**member.dict(), user_id=user_id)
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member


def delete_family_member(db: Session, member_id: int, user_id: int):
    """
    Deletes a family member and all associated photos.
    """
    # First, get the family member to ensure it exists and belongs to the user
    member = get_family_member(db, member_id, user_id)
    
    # Delete associated image files from filesystem
    for image in member.images:
        image_path = UPLOADS_DIR / image.file_path
        if image_path.exists():
            try:
                os.remove(image_path)
            except OSError:
                pass  # Continue even if file deletion fails
    
    # Delete the family member (this will cascade delete images due to the relationship)
    db.delete(member)
    db.commit()
    
    return {"message": "Family member deleted successfully"}


async def save_photo_for_member(
    db: Session, user_id: int, member_id: int, file: UploadFile = File(...)
):
    """
    Handles the logic for uploading, validating, and saving a photo for a family member.
    """
    # 1. Ensure the family member exists and belongs to the current user
    member = get_family_member(db, member_id, user_id)

    # 2. File Validation
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPG and PNG are accepted.",
        )

    # 3. Create a user-specific directory for uploads
    user_upload_dir = UPLOADS_DIR / str(user_id)
    user_upload_dir.mkdir(exist_ok=True)

    # 4. Secure Filename Generation
    file_extension = Path(file.filename).suffix
    secure_filename = f"{uuid.uuid4()}{file_extension}"
    temp_file_path = user_upload_dir / secure_filename

    # 5. Save the file temporarily
    try:
        with temp_file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # # 6. AI Validation: Temporarily disabled.
        # # This block will be re-enabled later to ensure a face is in the photo.
        # try:
        #     extracted_faces = DeepFace.extract_faces(
        #         img_path=str(temp_file_path),
        #         enforce_detection=False,
        #         detector_backend="mtcnn",
        #     )
        #     if not extracted_faces:
        #         raise ValueError("No face detected in the uploaded image.")
        # except Exception as e:
        #     os.remove(temp_file_path)
        #     raise HTTPException(
        #         status_code=status.HTTP_400_BAD_REQUEST,
        #         detail=f"Image validation failed: {e}",
        #     )

        # 7. Database Update
        # The file_path should be stored as a Unix-style path for consistency
        db_image = models.Image(
            family_member_id=member.id, file_path=str(temp_file_path.relative_to(UPLOADS_DIR)).replace("\\", "/")
        )
        db.add(db_image)
        db.commit()
        db.refresh(db_image)
        return db_image

    finally:
        # Ensure the file handler is closed
        file.file.close()
