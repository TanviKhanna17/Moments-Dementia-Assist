import re
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from sqlalchemy.orm import Session
from app.core.config import settings
from app.services.vector_service import VectorService
from app.models.models import ChatMessage, Document
from app.services.document_service import process_pdf, store_document_chunks


class RAGService:
    def __init__(self):
        self.vector_service = VectorService()
        
        # Configure Google Gemini
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
        else:
            print("Warning: GEMINI_API_KEY not set in configuration")


    def preprocess_query(self, query: str) -> str:
        """
        Clean and preprocess the user query.
        """
        # Remove extra whitespace
        query = re.sub(r'\s+', ' ', query.strip())
        
        # Convert to lowercase for better matching
        query = query.lower()
        
        return query


    def retrieve_relevant_context(self, query: str, user_id: int, max_chunks: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieve relevant document chunks for the query.
        """
        try:
            # Preprocess the query
            processed_query = self.preprocess_query(query)
            
            # Search for similar documents
            results = self.vector_service.search_similar_documents(
                processed_query, 
                user_id, 
                k=max_chunks
            )
            
            return results
            
        except Exception as e:
            print(f"Error retrieving context: {e}")
            return []


    def format_context_for_prompt(self, context_results: List[Dict[str, Any]]) -> str:
        """
        Format the retrieved context into a coherent string for the prompt.
        """
        if not context_results:
            return "No relevant information found in your documents."
        
        formatted_context = "PERSONAL INFORMATION FROM YOUR DOCUMENTS:\n\n"
        
        for i, result in enumerate(context_results, 1):
            content = result['content'].strip()
            # Clean up any existing markdown formatting
            content = content.replace('**', '').replace('*', '')
            formatted_context += f"[Document {i}]: {content}\n\n"
        
        return formatted_context


    def create_dementia_friendly_prompt(self, query: str, context: str) -> str:
        """
        Create a prompt optimized for dementia care responses.
        """
        # Detect question type for specialized handling
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['birthday', 'born', 'birth']):
            question_type = "personal_dates"
        elif any(word in query_lower for word in ['family', 'children', 'spouse', 'wife', 'husband', 'daughter', 'son']):
            question_type = "family"
        elif any(word in query_lower for word in ['medication', 'medicine', 'doctor', 'health', 'appointment']):
            question_type = "health"
        elif any(word in query_lower for word in ['work', 'job', 'career', 'profession']):
            question_type = "work"
        elif any(word in query_lower for word in ['where', 'live', 'address', 'home']):
            question_type = "location"
        else:
            question_type = "general"
        
        # Specialized prompts for different question types
        specialized_instructions = {
            "personal_dates": "Focus on specific dates and celebrations. Mention any special traditions or memories associated with the date.",
            "family": "Provide warm details about family relationships. Include names, relationships, and any special memories mentioned.",
            "health": "Be gentle and reassuring when discussing health matters. Focus on current care plans and important medical information.",
            "work": "Share details about their career and professional life. Include any pride they had in their work.",
            "location": "Provide clear information about where they live. Include any important details about the neighborhood or home.",
            "general": "Provide the most relevant information in a caring, organized way."
        }

        prompt = f"""You are a caring personal memory assistant helping someone remember important details from their life. You have access to their personal documents and should provide warm, clear, and reassuring responses.

RESPONSE GUIDELINES:
• Use simple, clear language with short sentences
• Be warm, patient, and reassuring in tone  
• Start with the most important information first
• Use everyday language, avoid medical or technical terms
• Never use asterisks, bullets, or special formatting characters
• Organize information naturally with clear breaks between topics
• If unsure about details, acknowledge it gently
• End on a positive, reassuring note when possible

SPECIAL FOCUS: {specialized_instructions[question_type]}

PERSONAL INFORMATION AVAILABLE:
{context}

QUESTION: {query}

Please provide a caring, well-organized response. Use natural paragraph breaks to separate different topics. Speak as if you're a trusted friend helping them remember."""

        return prompt


    def format_response_text(self, response: str) -> str:
        """
        Clean and format the response text for better readability.
        """
        # Remove any remaining markdown formatting
        response = response.replace('**', '')
        response = response.replace('*', '')
        
        # Clean up extra whitespace
        lines = [line.strip() for line in response.split('\n') if line.strip()]
        
        # Format into proper sections
        formatted_lines = []
        for line in lines:
            # Convert common section headers to proper format
            if any(header in line.lower() for header in ['basic:', 'family:', 'work:', 'health:', 'memories:', 'details:']):
                # Make it a proper heading
                formatted_lines.append(f"\n{line.replace(':', '')}")
            else:
                formatted_lines.append(line)
        
        return '\n'.join(formatted_lines).strip()

    def call_gemini_chat(self, prompt: str) -> str:
        """
        Make a request to Google Gemini for chat completion.
        """
        try:
            # Use Gemini Flash for fast responses
            model = genai.GenerativeModel('gemini-2.0-flash-exp')
            
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,  # Lower temperature for more consistent, factual responses
                    max_output_tokens=400,  # Appropriate length for dementia care
                    top_p=0.7  # More focused responses
                )
            )
            
            # Format the response for better readability
            formatted_response = self.format_response_text(response.text)
            return formatted_response
            
        except Exception as e:
            print(f"Error calling Gemini API: {e}")
            return "I'm sorry, I'm having trouble accessing my knowledge right now. Please try again in a moment."


    def answer_question(self, question: str, user_id: int, db: Session) -> Dict[str, Any]:
        """
        Main function to answer a user's question using RAG.
        """
        try:
            # Retrieve relevant context
            context_results = self.retrieve_relevant_context(question, user_id)
            
            # Format context for the prompt
            formatted_context = self.format_context_for_prompt(context_results)
            
            # Create the prompt
            prompt = self.create_dementia_friendly_prompt(question, formatted_context)
            
            # Get response from Gemini
            response = self.call_gemini_chat(prompt)
            
            # Calculate confidence score based on context quality
            confidence_score = self._calculate_confidence_score(context_results)
            
            # Store the conversation in the database
            chat_message = ChatMessage(
                user_id=user_id,
                question=question,
                response=response,
                confidence_score=confidence_score
            )
            
            db.add(chat_message)
            db.commit()
            db.refresh(chat_message)
            
            return {
                "question": question,
                "response": response,
                "confidence_score": confidence_score,
                "sources_used": len(context_results),
                "context_results": context_results
            }
            
        except Exception as e:
            print(f"Error answering question: {e}")
            return {
                "question": question,
                "response": "I'm sorry, I encountered an error while processing your question. Please try again.",
                "confidence_score": 0.0,
                "sources_used": 0,
                "context_results": []
            }


    def _calculate_confidence_score(self, context_results: List[Dict[str, Any]]) -> float:
        """
        Calculate a confidence score based on the quality of retrieved context.
        """
        if not context_results:
            return 0.0
        
        # Average similarity score of top results
        avg_similarity = sum(result['similarity_score'] for result in context_results) / len(context_results)
        
        # Bonus for having multiple relevant sources
        source_bonus = min(0.1 * len(context_results), 0.3)
        
        confidence = min(avg_similarity + source_bonus, 1.0)
        return round(confidence, 2)


    def process_and_index_document(self, file_path: str, filename: str, user_id: int, db: Session) -> Dict[str, Any]:
        """
        Process a document and add it to the user's knowledge base.
        """
        try:
            # Process the PDF and extract chunks
            chunks = process_pdf(file_path, filename, user_id)
            
            # Store document in database
            document = store_document_chunks(chunks, user_id, filename, db)
            
            # Add chunks to vector index
            self.vector_service.add_documents_to_index(user_id, chunks)
            
            return {
                "success": True,
                "document_id": document.id,
                "filename": filename,
                "chunks_processed": len(chunks),
                "message": f"Successfully processed {filename} with {len(chunks)} chunks"
            }
            
        except Exception as e:
            print(f"Error processing document {filename}: {e}")
            return {
                "success": False,
                "filename": filename,
                "error": str(e),
                "message": f"Failed to process {filename}"
            }


    def get_chat_history(self, user_id: int, db: Session, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get chat history for a user.
        """
        try:
            messages = db.query(ChatMessage).filter(
                ChatMessage.user_id == user_id
            ).order_by(
                ChatMessage.created_at.desc()
            ).limit(limit).all()
            
            return [
                {
                    "id": msg.id,
                    "question": msg.question,
                    "response": msg.response,
                    "confidence_score": msg.confidence_score,
                    "created_at": msg.created_at.isoformat()
                }
                for msg in reversed(messages)  # Reverse to get chronological order
            ]
            
        except Exception as e:
            print(f"Error getting chat history: {e}")
            return []


    def get_user_knowledge_stats(self, user_id: int, db: Session) -> Dict[str, Any]:
        """
        Get statistics about a user's knowledge base.
        """
        try:
            # Get document count from database
            doc_count = db.query(Document).filter(Document.user_id == user_id).count()
            
            # Get vector index stats
            vector_stats = self.vector_service.get_index_stats(user_id)
            
            # Get recent chat count
            recent_chats = db.query(ChatMessage).filter(ChatMessage.user_id == user_id).count()
            
            return {
                "total_documents": doc_count,
                "total_text_chunks": vector_stats.get("total_vectors", 0),
                "total_conversations": recent_chats,
                "knowledge_base_ready": doc_count > 0
            }
            
        except Exception as e:
            print(f"Error getting knowledge stats: {e}")
            return {
                "total_documents": 0,
                "total_text_chunks": 0,
                "total_conversations": 0,
                "knowledge_base_ready": False
            }


    def delete_user_knowledge_base(self, user_id: int, db: Session):
        """
        Delete all knowledge base data for a user.
        """
        try:
            # Delete from database
            db.query(Document).filter(Document.user_id == user_id).delete()
            db.query(ChatMessage).filter(ChatMessage.user_id == user_id).delete()
            db.commit()
            
            # Delete vector data
            self.vector_service.delete_user_data(user_id)
            
            print(f"Deleted knowledge base for user {user_id}")
            
        except Exception as e:
            db.rollback()
            print(f"Error deleting knowledge base for user {user_id}: {e}")
            raise
