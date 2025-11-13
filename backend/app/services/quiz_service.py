import random
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import models
from app.schemas import schemas


def generate_quiz_question(db: Session, user_id: int, num_options: int = 4):
    """
    Generates a new quiz question for the user.
    """
    # 1. Get all family members for the user who have at least one photo
    members_with_photos = (
        db.query(models.FamilyMember)
        .filter(models.FamilyMember.user_id == user_id, models.FamilyMember.images.any())
        .all()
    )

    if len(members_with_photos) < num_options:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not enough family members with photos to generate a quiz. Need at least {num_options}.",
        )

    # 2. Select the correct answer and distractors
    selected_members = random.sample(members_with_photos, num_options)
    correct_member = random.choice(selected_members)

    # 3. Select a random photo for the correct answer
    image_to_show = random.choice(correct_member.images)

    # 4. Prepare the response options
    options = [
        schemas.QuizOption(id=member.id, name=member.name) for member in selected_members
    ]
    random.shuffle(options)  # So the correct answer isn't always in the same place

    # 5. Format the image path as a URL-friendly string
    image_path = Path(image_to_show.file_path).as_posix()

    # 6. Return the formatted quiz question
    return schemas.QuizQuestion(
        image_url=f"/uploads/{image_path}",
        options=options,
        prompted_family_member_id=correct_member.id,
    )


def save_quiz_answer(db: Session, user_id: int, answer: schemas.QuizAnswer):
    """
    Saves the user's answer to the quiz_sessions table and returns the result.
    """
    is_correct = answer.prompted_family_member_id == answer.selected_family_member_id

    db_session = models.QuizSession(
        user_id=user_id,
        prompted_family_member_id=answer.prompted_family_member_id,
        selected_family_member_id=answer.selected_family_member_id,
        is_correct=is_correct,
        response_time_ms=answer.response_time_ms,
    )
    db.add(db_session)
    db.commit()

    return {"is_correct": is_correct, "correct_member_id": answer.prompted_family_member_id}
