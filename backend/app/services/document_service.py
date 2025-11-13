import os
import re
from typing import List, Dict, Any
from pathlib import Path
import PyPDF2
from sqlalchemy.orm import Session
from app.models.models import Document
from app.core.config import settings


class DocumentChunk:
    def __init__(self, content: str, metadata: Dict[str, Any] = None):
        self.content = content
        self.metadata = metadata or {}


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract text from a PDF file using PyPDF2.
    """
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ""
            
            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text.strip():  # Only add non-empty pages
                        text += f"\n--- Page {page_num + 1} ---\n"
                        text += page_text
                except Exception as e:
                    print(f"Error extracting text from page {page_num + 1}: {e}")
                    continue
            
            return text.strip()
    except Exception as e:
        print(f"Error reading PDF file {file_path}: {e}")
        return ""


def extract_metadata(text: str) -> Dict[str, Any]:
    """
    Extract metadata from text content including dates, names, locations.
    """
    metadata = {
        "dates": [],
        "people": [],
        "locations": [],
        "keywords": []
    }
    
    # Extract dates (various formats)
    date_patterns = [
        r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b',  # MM/DD/YYYY or DD/MM/YYYY
        r'\b\d{4}[/-]\d{1,2}[/-]\d{1,2}\b',    # YYYY/MM/DD
        r'\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b',
        r'\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b'
    ]
    
    for pattern in date_patterns:
        dates = re.findall(pattern, text, re.IGNORECASE)
        metadata["dates"].extend(dates)
    
    # Extract potential people names (capitalized words that could be names)
    # This is a simple heuristic - in practice you might want to use NER
    name_pattern = r'\b[A-Z][a-z]+\s+[A-Z][a-z]+\b'
    potential_names = re.findall(name_pattern, text)
    metadata["people"] = list(set(potential_names))  # Remove duplicates
    
    # Extract keywords (important terms)
    keywords = [
        "medicine", "medication", "doctor", "appointment", "birthday", "anniversary",
        "family", "daughter", "son", "wife", "husband", "mother", "father",
        "home", "address", "work", "job", "hospital", "clinic"
    ]
    
    found_keywords = []
    for keyword in keywords:
        if re.search(r'\b' + re.escape(keyword) + r'\b', text, re.IGNORECASE):
            found_keywords.append(keyword)
    
    metadata["keywords"] = found_keywords
    
    return metadata


def chunk_text(text: str, chunk_size: int = None) -> List[DocumentChunk]:
    """
    Split text into chunks for better retrieval.
    """
    if chunk_size is None:
        chunk_size = settings.CHUNK_SIZE
    
    # Split by sentences first to maintain context
    sentences = re.split(r'[.!?]+', text)
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        # If adding this sentence would exceed chunk size, save current chunk
        if len(current_chunk) + len(sentence) > chunk_size and current_chunk:
            # Extract metadata for this chunk
            chunk_metadata = extract_metadata(current_chunk)
            chunks.append(DocumentChunk(current_chunk.strip(), chunk_metadata))
            current_chunk = sentence
        else:
            current_chunk += " " + sentence if current_chunk else sentence
    
    # Add the last chunk if it has content
    if current_chunk.strip():
        chunk_metadata = extract_metadata(current_chunk)
        chunks.append(DocumentChunk(current_chunk.strip(), chunk_metadata))
    
    return chunks


def process_pdf(file_path: str, filename: str, user_id: int) -> List[DocumentChunk]:
    """
    Process a PDF file and return document chunks.
    """
    try:
        # Extract text from PDF
        text = extract_text_from_pdf(file_path)
        
        if not text:
            raise ValueError(f"No text could be extracted from {filename}")
        
        # Extract overall document metadata
        doc_metadata = extract_metadata(text)
        doc_metadata["filename"] = filename
        doc_metadata["user_id"] = user_id
        doc_metadata["original_file_path"] = file_path
        
        # Chunk the text
        chunks = chunk_text(text)
        
        # Add document-level metadata to each chunk
        for chunk in chunks:
            chunk.metadata.update({
                "filename": filename,
                "user_id": user_id,
                "total_chunks": len(chunks)
            })
        
        return chunks
        
    except Exception as e:
        print(f"Error processing PDF {filename}: {e}")
        raise


def store_document_chunks(chunks: List[DocumentChunk], user_id: int, filename: str, db: Session):
    """
    Store document chunks in the database.
    """
    try:
        # Combine all chunk content for the main document record
        full_content = "\n\n".join([chunk.content for chunk in chunks])
        
        # Create the main document record
        document = Document(
            user_id=user_id,
            filename=filename,
            content=full_content,
            document_metadata={
                "total_chunks": len(chunks),
                "chunk_metadata": [chunk.metadata for chunk in chunks]
            }
        )
        
        db.add(document)
        db.commit()
        db.refresh(document)
        
        return document
        
    except Exception as e:
        db.rollback()
        print(f"Error storing document chunks: {e}")
        raise


def get_user_documents(user_id: int, db: Session) -> List[Document]:
    """
    Get all documents for a user.
    """
    return db.query(Document).filter(Document.user_id == user_id).all()


def delete_document(document_id: int, user_id: int, db: Session) -> bool:
    """
    Delete a document and its associated data.
    """
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.user_id == user_id
        ).first()
        
        if document:
            db.delete(document)
            db.commit()
            return True
        
        return False
        
    except Exception as e:
        db.rollback()
        print(f"Error deleting document: {e}")
        return False
