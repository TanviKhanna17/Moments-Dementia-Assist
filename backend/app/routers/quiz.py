from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from app.schemas import schemas
from app.services import auth_service, quiz_service
from app.services.simple_mcq_service import SimpleMCQService

router = APIRouter(
    prefix="/quiz",
    tags=["quiz"],
    dependencies=[Depends(auth_service.get_current_active_user)],
    responses={404: {"description": "Not found"}},
)

# Initialize the simple MCQ service
simple_mcq_service = SimpleMCQService()


# Basic Photo Recognition Quiz (Original)
@router.get("/question", response_model=schemas.QuizQuestion)
def get_quiz_question(
    db: Session = Depends(auth_service.get_db),
    current_user: schemas.User = Depends(auth_service.get_current_active_user),
):
    """
    Generate a new quiz question with 4 options.
    Requires that at least 4 family members with photos exist.
    """
    return quiz_service.generate_quiz_question(db=db, user_id=current_user.id, num_options=4)


@router.post("/answer")
def submit_quiz_answer(
    answer: schemas.QuizAnswer,
    db: Session = Depends(auth_service.get_db),
    current_user: schemas.User = Depends(auth_service.get_current_active_user),
):
    """
    Submit an answer to a quiz question and record the result.
    Returns whether the answer was correct and the ID of the correct member.
    """
    return quiz_service.save_quiz_answer(db=db, user_id=current_user.id, answer=answer)


# Simple Document MCQ using Gemini + FAISS
@router.get("/document-mcq")
def get_document_mcq(
    question_type: Optional[str] = None,  # 'people', 'activities', 'health', 'dates', 'general'
    current_user: schemas.User = Depends(auth_service.get_current_active_user)
):
    """
    Generate MCQ using Gemini + FAISS indexes
    """
    return simple_mcq_service.generate_mcq_from_documents(
        user_id=current_user.id,
        question_type=question_type
    )


@router.post("/document-mcq/answer")
def submit_mcq_answer(
    answer_data: dict,  # {question_id, user_answer, question_data}
    current_user: schemas.User = Depends(auth_service.get_current_active_user)
):
    """
    Submit answer to document MCQ
    """
    return simple_mcq_service.evaluate_mcq_answer(
        question_data=answer_data["question_data"],
        user_answer=answer_data["user_answer"]
    )


@router.get("/test-gemini")
def test_gemini_connection(
    current_user: schemas.User = Depends(auth_service.get_current_active_user)
):
    """
    Test Gemini API connection
    """
    import os
    import google.generativeai as genai
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"error": "GEMINI_API_KEY environment variable is not set"}
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("Say hello!")
        return {
            "success": True,
            "model": "gemini-1.5-flash",
            "response": response.text[:100]
        }
    except Exception as e:
        return {
            "error": str(e),
            "error_type": type(e).__name__
        }


# Enhanced Session-Based Quiz Endpoints

@router.post("/document-quiz/setup", response_model=schemas.DocumentQuizSessionResponse)
def setup_quiz_session(
    setup_data: schemas.QuizSessionCreate,
    db: Session = Depends(auth_service.get_db),
    current_user: schemas.User = Depends(auth_service.get_current_active_user)
):
    """
    Setup a new document quiz session with custom parameters
    """
    return simple_mcq_service.create_quiz_session(
        user_id=current_user.id,
        setup_data=setup_data,
        db=db
    )


@router.get("/document-quiz/session/{session_id}/question/{question_number}")
def get_session_question(
    session_id: int,
    question_number: int,
    db: Session = Depends(auth_service.get_db),
    current_user: schemas.User = Depends(auth_service.get_current_active_user)
):
    """
    Get next question for a quiz session
    """
    return simple_mcq_service.get_session_question(
        session_id=session_id,
        question_number=question_number,
        user_id=current_user.id,
        db=db
    )


@router.post("/document-quiz/session/{session_id}/answer")
def submit_session_answer(
    session_id: int,
    answer_data: dict,  # {question_id, user_answer, response_time}
    db: Session = Depends(auth_service.get_db),
    current_user: schemas.User = Depends(auth_service.get_current_active_user)
):
    """
    Submit answer for a session question
    """
    return simple_mcq_service.submit_session_answer(
        session_id=session_id,
        question_id=answer_data["question_id"],
        user_answer=answer_data["user_answer"],
        response_time=answer_data["response_time"],
        user_id=current_user.id,
        db=db
    )


@router.post("/document-quiz/session/{session_id}/complete", response_model=schemas.QuizSessionStats)
def complete_quiz_session(
    session_id: int,
    db: Session = Depends(auth_service.get_db),
    current_user: schemas.User = Depends(auth_service.get_current_active_user)
):
    """
    Complete a quiz session and get AI-generated insights
    """
    return simple_mcq_service.complete_session(
        session_id=session_id,
        user_id=current_user.id,
        db=db
    )


@router.get("/document-quiz/history", response_model=schemas.QuizHistoryResponse)
def get_quiz_history(
    db: Session = Depends(auth_service.get_db),
    current_user: schemas.User = Depends(auth_service.get_current_active_user)
):
    """
    Get user's quiz history with AI insights
    """
    return simple_mcq_service.get_quiz_history(
        user_id=current_user.id,
        db=db
    )