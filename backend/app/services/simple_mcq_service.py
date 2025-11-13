from typing import List, Dict, Any, Optional
import uuid
import random
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.services.rag_service import RAGService
from app.schemas.schemas import QuizOption, QuizSessionCreate, DocumentQuizSessionResponse, QuizSessionStats
from app.models.models import DocumentQuizSession, DocumentQuizQuestion
import google.generativeai as genai
import os
import json

class SimpleMCQService:
    def __init__(self):
        self.rag_service = RAGService()
        # Initialize Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    def generate_mcq_from_documents(self, user_id: int, question_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Simple MCQ generation using Gemini + FAISS indexes
        """
        print(f"🤖 Generating MCQ for user {user_id}, type: {question_type}")
        
        # 1. Get relevant context from FAISS indexes
        context_chunks = self._get_document_context(user_id, question_type)
        
        if not context_chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No documents found to generate questions. Please upload some personal documents first."
            )
        
        # 2. Use Gemini to generate MCQ
        mcq_data = self._generate_mcq_with_gemini(context_chunks, question_type)
        
        if not mcq_data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate question from your documents."
            )
        
        return {
            "id": str(uuid.uuid4()),
            "question_text": mcq_data["question"],
            "question_type": question_type or "general",
            "options": [QuizOption(id=i, name=option) for i, option in enumerate(mcq_data["options"])],
            "correct_answer": mcq_data["correct_answer"],
            "explanation": mcq_data["explanation"],
            "background_context": mcq_data.get("context", "")
        }

    def _get_document_context(self, user_id: int, question_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get relevant context from FAISS indexes"""
        
        # Define search queries based on question type
        if question_type == "people":
            queries = ["family members", "people", "names", "relationships"]
        elif question_type == "activities":
            queries = ["activities", "hobbies", "daily routine", "things to do"]
        elif question_type == "health":
            queries = ["health", "medication", "doctor", "medical"]
        elif question_type == "dates":
            queries = ["dates", "appointments", "schedule", "time"]
        else:
            queries = ["personal information", "daily life", "important details", "memories"]
        
        all_contexts = []
        for query in queries:
            print(f"🔍 Searching with query: '{query}'")
            results = self.rag_service.retrieve_relevant_context(query, user_id, max_chunks=3)
            all_contexts.extend(results)
            print(f"Found {len(results)} results for '{query}'")
        
        print(f"Total context chunks: {len(all_contexts)}")
        return all_contexts

    def _generate_mcq_with_gemini(self, context_chunks: List[Dict[str, Any]], question_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Use Gemini to generate MCQ from context"""
        
        # Combine context
        combined_context = "\n\n".join([chunk["content"] for chunk in context_chunks[:5]])  # Limit to 5 chunks
        
        # Create prompt for Gemini
        prompt = f"""
Based on the following personal document content, create a multiple choice question that tests memory and knowledge about the person's life.

Document Content:
{combined_context}

Requirements:
1. Create ONE multiple choice question with 4 options (A, B, C, D)
2. The question should be about {question_type if question_type else "general information"} from the documents
3. Make it personal and specific to the content provided
4. Include the correct answer
5. Provide a brief explanation

Respond in this EXACT JSON format:
{{
    "question": "Your question here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "explanation": "Brief explanation of why this is correct",
    "context": "Brief context from the documents that supports this question"
}}

Make the question personal and meaningful based on the document content.
"""

        try:
            print(f"🤖 Calling Gemini API with model: {self.model.model_name}")
            print(f"🤖 Prompt length: {len(prompt)} characters")
            
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            print(f"🤖 Gemini response: {response_text[:200]}...")
            
            # Try to extract JSON from response
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "").replace("```", "").strip()
            elif response_text.startswith("```"):
                response_text = response_text.replace("```", "").strip()
            
            # Parse JSON
            mcq_data = json.loads(response_text)
            
            # Validate required fields
            required_fields = ["question", "options", "correct_answer", "explanation"]
            if not all(field in mcq_data for field in required_fields):
                print(f"❌ Missing required fields in Gemini response: {mcq_data}")
                return None
            
            if len(mcq_data["options"]) != 4:
                print(f"❌ Invalid number of options: {len(mcq_data['options'])}")
                return None
            
            print("✅ Successfully generated MCQ with Gemini")
            return mcq_data
            
        except json.JSONDecodeError as e:
            print(f"❌ Failed to parse Gemini JSON response: {e}")
            print(f"Raw response: {response_text}")
            return None
        except Exception as e:
            print(f"❌ Error calling Gemini API: {e}")
            print(f"Error type: {type(e).__name__}")
            if hasattr(e, 'response'):
                print(f"Error response: {e.response}")
            return None

    def evaluate_mcq_answer(self, question_data: Dict[str, Any], user_answer: str) -> Dict[str, Any]:
        """Evaluate user's answer to MCQ"""
        
        is_correct = user_answer == question_data["correct_answer"]
        
        return {
            "is_correct": is_correct,
            "correct_answer": question_data["correct_answer"],
            "explanation": question_data["explanation"],
            "background_story": question_data.get("background_context", "")
        }

    # Enhanced Session Management Methods
    
    def create_quiz_session(self, user_id: int, setup_data: QuizSessionCreate, db: Session) -> DocumentQuizSessionResponse:
        """Create a new quiz session"""
        
        session = DocumentQuizSession(
            user_id=user_id,
            session_name=setup_data.session_name,
            total_questions=min(setup_data.total_questions, 15),  # Max 15 questions
            questions_answered=0,
            correct_answers=0
        )
        
        db.add(session)
        db.commit()
        db.refresh(session)
        
        return DocumentQuizSessionResponse.from_orm(session)
    
    def get_session_question(self, session_id: int, question_number: int, user_id: int, db: Session) -> Dict[str, Any]:
        """Get next question for a session"""
        
        session = db.query(DocumentQuizSession).filter(
            DocumentQuizSession.id == session_id,
            DocumentQuizSession.user_id == user_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Generate question using existing method
        question_data = self.generate_mcq_from_documents(user_id, None)
        
        # Store question in database
        db_question = DocumentQuizQuestion(
            session_id=session_id,
            question_text=question_data["question_text"],
            question_type=question_data["question_type"],
            correct_answer=question_data["correct_answer"],
            confidence_score=0.8,  # Default confidence
            question_context=question_data.get("background_context", "")
        )
        
        db.add(db_question)
        db.commit()
        db.refresh(db_question)
        
        # Add question_id to response
        question_data["question_id"] = db_question.id
        question_data["session_id"] = session_id
        question_data["question_number"] = question_number
        
        return question_data
    
    def submit_session_answer(self, session_id: int, question_id: int, user_answer: str, 
                            response_time: int, user_id: int, db: Session) -> Dict[str, Any]:
        """Submit answer for a session question"""
        
        # Get question
        question = db.query(DocumentQuizQuestion).filter(
            DocumentQuizQuestion.id == question_id,
            DocumentQuizQuestion.session_id == session_id
        ).first()
        
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Update question with answer
        is_correct = user_answer == question.correct_answer
        question.user_answer = user_answer
        question.is_correct = is_correct
        question.response_time = response_time
        
        # Update session stats
        session = db.query(DocumentQuizSession).filter(
            DocumentQuizSession.id == session_id
        ).first()
        
        session.questions_answered += 1
        if is_correct:
            session.correct_answers += 1
        
        # Update session totals
        if session.total_time_spent:
            session.total_time_spent += response_time
        else:
            session.total_time_spent = response_time
            
        session.avg_response_time = session.total_time_spent / session.questions_answered
        session.session_score = (session.correct_answers / session.questions_answered) * 100
        
        db.commit()
        
        return {
            "is_correct": is_correct,
            "correct_answer": question.correct_answer,
            "session_progress": f"{session.questions_answered}/{session.total_questions}",
            "current_score": session.session_score
        }
    
    def complete_session(self, session_id: int, user_id: int, db: Session) -> QuizSessionStats:
        """Complete a quiz session and generate insights"""
        
        # Get session and questions
        session = db.query(DocumentQuizSession).filter(
            DocumentQuizSession.id == session_id,
            DocumentQuizSession.user_id == user_id
        ).first()
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        questions = db.query(DocumentQuizQuestion).filter(
            DocumentQuizQuestion.session_id == session_id
        ).all()
        
        # Mark session as completed
        session.completed_at = datetime.utcnow()
        
        # Generate Gemini insights
        insights = self._generate_session_insights(session, questions)
        session.gemini_insights = insights["summary"]
        
        db.commit()
        
        # Prepare response
        session_response = DocumentQuizSessionResponse.from_orm(session)
        question_responses = [
            {
                "id": q.id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "correct_answer": q.correct_answer,
                "user_answer": q.user_answer,
                "is_correct": q.is_correct,
                "response_time": q.response_time,
                "confidence_score": q.confidence_score,
                "created_at": q.created_at
            }
            for q in questions
        ]
        
        return QuizSessionStats(
            session=session_response,
            questions=question_responses,
            insights=insights["summary"],
            performance_breakdown=insights["performance_breakdown"],
            time_analysis=insights["time_analysis"],
            recommendations=insights["recommendations"]
        )
    
    def _generate_session_insights(self, session: DocumentQuizSession, questions: List[DocumentQuizQuestion]) -> Dict[str, Any]:
        """Generate AI insights about the quiz session"""
        
        # Prepare data for Gemini
        session_data = {
            "total_questions": len(questions),
            "correct_answers": session.correct_answers,
            "score_percentage": session.session_score,
            "avg_response_time": session.avg_response_time,
            "total_time": session.total_time_spent
        }
        
        # Analyze by question type
        type_performance = {}
        for q in questions:
            if q.question_type not in type_performance:
                type_performance[q.question_type] = {"correct": 0, "total": 0, "avg_time": 0}
            type_performance[q.question_type]["total"] += 1
            if q.is_correct:
                type_performance[q.question_type]["correct"] += 1
            if q.response_time:
                type_performance[q.question_type]["avg_time"] += q.response_time
        
        # Calculate averages
        for qtype, data in type_performance.items():
            if data["total"] > 0:
                data["accuracy"] = (data["correct"] / data["total"]) * 100
                data["avg_time"] = data["avg_time"] / data["total"]
        
        # Generate insights with Gemini
        prompt = f"""
        Analyze this memory care quiz session and provide detailed insights:
        
        Session Summary:
        - Total Questions: {session_data['total_questions']}
        - Correct Answers: {session_data['correct_answers']}
        - Score: {session_data['score_percentage']:.1f}%
        - Average Response Time: {session_data['avg_response_time']:.1f} seconds
        - Total Time: {session_data['total_time']} seconds
        
        Performance by Question Type:
        {json.dumps(type_performance, indent=2)}
        
        Please provide:
        1. A summary of the person's cognitive performance
        2. Specific strengths and areas for improvement
        3. 3-5 personalized recommendations for memory care
        4. Insights about response patterns and timing
        
        Format as JSON:
        {{
            "summary": "Overall assessment...",
            "strengths": ["strength1", "strength2"],
            "improvement_areas": ["area1", "area2"],
            "recommendations": ["rec1", "rec2", "rec3"],
            "time_insights": "Analysis of timing patterns...",
            "cognitive_notes": "Professional insights..."
        }}
        """
        
        try:
            response = self.model.generate_content(prompt)
            response_text = response.text.strip()
            
            # Clean JSON response
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "").replace("```", "").strip()
            
            gemini_insights = json.loads(response_text)
            
            return {
                "summary": gemini_insights.get("summary", "Session completed successfully"),
                "performance_breakdown": type_performance,
                "time_analysis": {
                    "avg_response_time": session_data["avg_response_time"],
                    "total_time": session_data["total_time"],
                    "time_insights": gemini_insights.get("time_insights", "No timing insights available")
                },
                "recommendations": gemini_insights.get("recommendations", ["Continue regular practice"])
            }
            
        except Exception as e:
            print(f"❌ Error generating insights: {e}")
            return {
                "summary": f"Session completed with {session_data['score_percentage']:.1f}% accuracy",
                "performance_breakdown": type_performance,
                "time_analysis": {
                    "avg_response_time": session_data["avg_response_time"],
                    "total_time": session_data["total_time"],
                    "time_insights": "Unable to generate timing insights"
                },
                "recommendations": ["Continue regular practice", "Focus on areas with lower accuracy"]
            }
    
    def get_quiz_history(self, user_id: int, db: Session) -> Dict[str, Any]:
        """Get user's quiz history with Gemini-powered summary"""
        
        sessions = db.query(DocumentQuizSession).filter(
            DocumentQuizSession.user_id == user_id,
            DocumentQuizSession.completed_at.isnot(None)
        ).order_by(DocumentQuizSession.created_at.desc()).limit(20).all()
        
        if not sessions:
            return {
                "sessions": [],
                "total_sessions": 0,
                "average_score": 0,
                "improvement_trend": "No data available",
                "gemini_summary": "No quiz sessions completed yet"
            }
        
        # Calculate statistics
        total_sessions = len(sessions)
        average_score = sum(s.session_score or 0 for s in sessions) / total_sessions
        
        # Generate trend analysis with Gemini
        recent_scores = [s.session_score for s in sessions[:5] if s.session_score]
        older_scores = [s.session_score for s in sessions[5:10] if s.session_score]
        
        trend_prompt = f"""
        Analyze this memory care quiz history and provide insights:
        
        Total Sessions: {total_sessions}
        Average Score: {average_score:.1f}%
        Recent 5 Sessions Scores: {recent_scores}
        Previous 5 Sessions Scores: {older_scores}
        
        Provide a brief trend analysis and overall progress summary (max 200 words).
        """
        
        try:
            response = self.model.generate_content(trend_prompt)
            gemini_summary = response.text.strip()
        except:
            gemini_summary = f"Completed {total_sessions} sessions with an average score of {average_score:.1f}%"
        
        # Determine improvement trend
        if len(recent_scores) >= 3 and len(older_scores) >= 3:
            recent_avg = sum(recent_scores) / len(recent_scores)
            older_avg = sum(older_scores) / len(older_scores)
            if recent_avg > older_avg + 5:
                improvement_trend = "Improving"
            elif recent_avg < older_avg - 5:
                improvement_trend = "Declining"
            else:
                improvement_trend = "Stable"
        else:
            improvement_trend = "Insufficient data"
        
        return {
            "sessions": [DocumentQuizSessionResponse.from_orm(s) for s in sessions],
            "total_sessions": total_sessions,
            "average_score": average_score,
            "improvement_trend": improvement_trend,
            "gemini_summary": gemini_summary
        }
