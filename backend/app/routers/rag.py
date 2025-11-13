import os
import shutil
from typing import List
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import User, Document
from app.schemas.schemas import (
    ChatQuery, 
    ChatResponse, 
    DocumentInfo, 
    DocumentUploadResponse,
    ChatHistory,
    KnowledgeBaseStats
)
from app.services.auth_service import get_current_user
from app.services.rag_service import RAGService

router = APIRouter(prefix="/rag", tags=["RAG"])

# Initialize RAG service
rag_service = RAGService()

# Configure upload directory
UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "documents"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/documents/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload and process a PDF document for the RAG system.
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are supported"
            )
        
        # Create user-specific upload directory
        user_upload_dir = UPLOAD_DIR / str(current_user.id)
        user_upload_dir.mkdir(exist_ok=True)
        
        # Save uploaded file
        file_path = user_upload_dir / file.filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Process the document
        result = rag_service.process_and_index_document(
            str(file_path),
            file.filename,
            current_user.id,
            db
        )
        
        return DocumentUploadResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing document: {str(e)}"
        )


@router.post("/chat/query", response_model=ChatResponse)
async def chat_query(
    query: ChatQuery,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Ask a question and get an answer from the RAG system.
    """
    try:
        if not query.question.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Question cannot be empty"
            )
        
        # Get answer from RAG service
        result = rag_service.answer_question(
            query.question,
            current_user.id,
            db
        )
        
        return ChatResponse(
            question=result["question"],
            response=result["response"],
            confidence_score=result["confidence_score"],
            sources_used=result["sources_used"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing query: {str(e)}"
        )


@router.get("/chat/history", response_model=List[ChatHistory])
async def get_chat_history(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get chat history for the current user.
    """
    try:
        history = rag_service.get_chat_history(current_user.id, db, limit)
        return [ChatHistory(**msg) for msg in history]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving chat history: {str(e)}"
        )


@router.get("/documents/", response_model=List[DocumentInfo])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all documents uploaded by the current user.
    """
    try:
        documents = db.query(Document).filter(
            Document.user_id == current_user.id
        ).order_by(Document.created_at.desc()).all()
        
        result = []
        for doc in documents:
            chunks_count = None
            if doc.document_metadata and isinstance(doc.document_metadata, dict):
                chunks_count = doc.document_metadata.get("total_chunks")
            
            result.append(DocumentInfo(
                id=doc.id,
                filename=doc.filename,
                created_at=doc.created_at,
                chunks_count=chunks_count
            ))
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving documents: {str(e)}"
        )


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a document and its associated data.
    """
    try:
        # Find the document
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.user_id == current_user.id
        ).first()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        # Delete from database
        db.delete(document)
        db.commit()
        
        # TODO: In a production system, you might want to rebuild the FAISS index
        # after deleting documents to remove the vectors completely
        
        return {"message": f"Document '{document.filename}' deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting document: {str(e)}"
        )


@router.get("/knowledge-base/stats", response_model=KnowledgeBaseStats)
async def get_knowledge_base_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get statistics about the user's knowledge base.
    """
    try:
        stats = rag_service.get_user_knowledge_stats(current_user.id, db)
        return KnowledgeBaseStats(**stats)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving knowledge base stats: {str(e)}"
        )


@router.delete("/knowledge-base/reset")
async def reset_knowledge_base(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete all knowledge base data for the current user.
    """
    try:
        rag_service.delete_user_knowledge_base(current_user.id, db)
        
        # Also delete uploaded files
        user_upload_dir = UPLOAD_DIR / str(current_user.id)
        if user_upload_dir.exists():
            shutil.rmtree(user_upload_dir)
        
        return {"message": "Knowledge base reset successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resetting knowledge base: {str(e)}"
        )


@router.post("/initialize-demo")
async def initialize_demo_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Initialize the knowledge base with demo documents from rag-docs directory.
    """
    try:
        # Path to the demo documents
        demo_docs_path = Path(__file__).resolve().parent.parent.parent / "rag-docs"
        
        if not demo_docs_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Demo documents directory not found"
            )
        
        processed_files = []
        
        # Process all PDF files in the demo directory
        for pdf_file in demo_docs_path.glob("*.pdf"):
            try:
                result = rag_service.process_and_index_document(
                    str(pdf_file),
                    pdf_file.name,
                    current_user.id,
                    db
                )
                processed_files.append(result)
                
            except Exception as e:
                print(f"Error processing {pdf_file.name}: {e}")
                processed_files.append({
                    "success": False,
                    "filename": pdf_file.name,
                    "error": str(e)
                })
        
        success_count = sum(1 for f in processed_files if f.get("success", False))
        
        return {
            "message": f"Processed {success_count} out of {len(processed_files)} demo documents",
            "processed_files": processed_files
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error initializing demo data: {str(e)}"
        )
