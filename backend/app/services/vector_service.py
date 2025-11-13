import os
import pickle
from typing import List, Dict, Any, Optional
import numpy as np
import faiss
import google.generativeai as genai
from pathlib import Path
from app.core.config import settings
from app.services.document_service import DocumentChunk


class VectorService:
    def __init__(self):
        # Configure Google Gemini
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
        else:
            print("Warning: GEMINI_API_KEY not set in configuration")
        
        # Ensure FAISS index directory exists
        self.faiss_dir = Path(settings.FAISS_INDEX_PATH)
        self.faiss_dir.mkdir(exist_ok=True)


    def get_gemini_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings using Google Gemini text-embedding-004.
        """
        try:
            embeddings = []
            
            for text in texts:
                # Clean the text to avoid issues
                clean_text = text.strip()
                if not clean_text:
                    # Create a zero vector for empty text
                    embeddings.append([0.0] * 768)  # Default embedding dimension
                    continue
                
                # Generate embedding using Gemini
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=clean_text,
                    task_type="retrieval_document"
                )
                
                embeddings.append(result['embedding'])
            
            return embeddings
            
        except Exception as e:
            print(f"Error generating embeddings: {e}")
            # Return zero vectors as fallback
            return [[0.0] * 768 for _ in texts]


    def get_query_embedding(self, query: str) -> List[float]:
        """
        Generate embedding for a search query.
        """
        try:
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=query.strip(),
                task_type="retrieval_query"
            )
            return result['embedding']
            
        except Exception as e:
            print(f"Error generating query embedding: {e}")
            return [0.0] * 768  # Return zero vector as fallback


    def _get_index_path(self, user_id: int) -> Path:
        """Get the file path for a user's FAISS index."""
        return self.faiss_dir / f"user_{user_id}.index"


    def _get_metadata_path(self, user_id: int) -> Path:
        """Get the file path for a user's metadata."""
        return self.faiss_dir / f"user_{user_id}_metadata.pkl"


    def create_faiss_index(self, user_id: int, dimension: int = 768) -> faiss.IndexFlatIP:
        """
        Create a new FAISS index for a user.
        """
        try:
            # Create inner product index (good for normalized embeddings)
            index = faiss.IndexFlatIP(dimension)
            return index
            
        except Exception as e:
            print(f"Error creating FAISS index for user {user_id}: {e}")
            raise


    def load_user_index(self, user_id: int) -> Optional[faiss.IndexFlatIP]:
        """
        Load a user's FAISS index from disk.
        """
        try:
            index_path = self._get_index_path(user_id)
            
            if not index_path.exists():
                return None
            
            index = faiss.read_index(str(index_path))
            return index
            
        except Exception as e:
            print(f"Error loading index for user {user_id}: {e}")
            return None


    def save_user_index(self, user_id: int, index: faiss.IndexFlatIP):
        """
        Save a user's FAISS index to disk.
        """
        try:
            index_path = self._get_index_path(user_id)
            faiss.write_index(index, str(index_path))
            
        except Exception as e:
            print(f"Error saving index for user {user_id}: {e}")
            raise


    def load_user_metadata(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Load metadata for a user's documents.
        """
        try:
            metadata_path = self._get_metadata_path(user_id)
            
            if not metadata_path.exists():
                return []
            
            with open(metadata_path, 'rb') as f:
                metadata = pickle.load(f)
            
            return metadata
            
        except Exception as e:
            print(f"Error loading metadata for user {user_id}: {e}")
            return []


    def save_user_metadata(self, user_id: int, metadata: List[Dict[str, Any]]):
        """
        Save metadata for a user's documents.
        """
        try:
            metadata_path = self._get_metadata_path(user_id)
            
            with open(metadata_path, 'wb') as f:
                pickle.dump(metadata, f)
                
        except Exception as e:
            print(f"Error saving metadata for user {user_id}: {e}")
            raise


    def add_documents_to_index(self, user_id: int, chunks: List[DocumentChunk]):
        """
        Add document chunks to a user's FAISS index.
        """
        try:
            # Extract text content for embedding
            texts = [chunk.content for chunk in chunks]
            
            # Generate embeddings
            embeddings = self.get_gemini_embeddings(texts)
            
            # Convert to numpy array and normalize for inner product similarity
            embeddings_array = np.array(embeddings, dtype=np.float32)
            faiss.normalize_L2(embeddings_array)
            
            # Load or create index
            index = self.load_user_index(user_id)
            if index is None:
                index = self.create_faiss_index(user_id, embeddings_array.shape[1])
            
            # Load existing metadata
            existing_metadata = self.load_user_metadata(user_id)
            
            # Add new vectors to index
            index.add(embeddings_array)
            
            # Prepare metadata for the new chunks
            new_metadata = []
            for i, chunk in enumerate(chunks):
                metadata = {
                    'content': chunk.content,
                    'metadata': chunk.metadata,
                    'index_id': len(existing_metadata) + i
                }
                new_metadata.append(metadata)
            
            # Combine with existing metadata
            all_metadata = existing_metadata + new_metadata
            
            # Save index and metadata
            self.save_user_index(user_id, index)
            self.save_user_metadata(user_id, all_metadata)
            
            print(f"Added {len(chunks)} chunks to index for user {user_id}")
            
        except Exception as e:
            print(f"Error adding documents to index for user {user_id}: {e}")
            raise


    def search_similar_documents(self, query: str, user_id: int, k: int = 3) -> List[Dict[str, Any]]:
        """
        Search for similar documents using FAISS.
        """
        try:
            # Load user's index and metadata
            index = self.load_user_index(user_id)
            metadata = self.load_user_metadata(user_id)
            
            if index is None or not metadata:
                return []
            
            # Generate query embedding
            query_embedding = self.get_query_embedding(query)
            query_vector = np.array([query_embedding], dtype=np.float32)
            faiss.normalize_L2(query_vector)
            
            # Search for similar vectors
            scores, indices = index.search(query_vector, min(k, index.ntotal))
            
            # Prepare results
            filtered_results = []
            ranked_candidates = []
            for i, (score, idx) in enumerate(zip(scores[0], indices[0])):
                if idx >= 0 and idx < len(metadata):  # Valid index
                    result = {
                        'content': metadata[idx]['content'],
                        'metadata': metadata[idx]['metadata'],
                        'similarity_score': float(score),
                        'rank': i + 1
                    }
                    ranked_candidates.append(result)
                    
                    # Filter by similarity threshold
                    if score >= settings.SIMILARITY_THRESHOLD:
                        filtered_results.append(result)
            
            if filtered_results:
                return filtered_results
            
            # If nothing met the threshold, fall back to the top candidates
            min_results = max(getattr(settings, 'MIN_CONTEXT_RESULTS', 1), 1)
            return ranked_candidates[:min_results]
            
        except Exception as e:
            print(f"Error searching documents for user {user_id}: {e}")
            return []


    def delete_user_data(self, user_id: int):
        """
        Delete all vector data for a user.
        """
        try:
            index_path = self._get_index_path(user_id)
            metadata_path = self._get_metadata_path(user_id)
            
            if index_path.exists():
                index_path.unlink()
            
            if metadata_path.exists():
                metadata_path.unlink()
                
            print(f"Deleted vector data for user {user_id}")
            
        except Exception as e:
            print(f"Error deleting vector data for user {user_id}: {e}")


    def get_index_stats(self, user_id: int) -> Dict[str, Any]:
        """
        Get statistics about a user's index.
        """
        try:
            index = self.load_user_index(user_id)
            metadata = self.load_user_metadata(user_id)
            
            if index is None:
                return {"total_vectors": 0, "total_documents": 0}
            
            return {
                "total_vectors": index.ntotal,
                "total_documents": len(set(m.get('metadata', {}).get('filename', '') for m in metadata)),
                "dimension": index.d
            }
            
        except Exception as e:
            print(f"Error getting index stats for user {user_id}: {e}")
            return {"total_vectors": 0, "total_documents": 0}
