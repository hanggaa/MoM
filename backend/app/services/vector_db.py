import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.core.config import STORAGE_DIR

logger = logging.getLogger(__name__)

_client = None

def get_chroma_client():
    global _client
    if _client is None:
        try:
            # Fix for SQLite version on older Linux (GCP VMs)
            try:
                import pysqlite3
                import sys
                sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')
            except ImportError:
                pass

            import chromadb
            chroma_dir = STORAGE_DIR / "chroma"
            chroma_dir.mkdir(parents=True, exist_ok=True)
            _client = chromadb.PersistentClient(path=str(chroma_dir))
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            return None
    return _client

def get_meetings_collection():
    client = get_chroma_client()
    if not client:
        return None
    return client.get_or_create_collection(name="meeting_transcripts")

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    """Simple character-based chunking with overlap."""
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        
        # Try to break at a newline or period if we are not at the end
        if end < len(text):
            last_newline = text.rfind('\n', start, end)
            last_period = text.rfind('.', start, end)
            break_point = max(last_newline, last_period)
            if break_point > start + chunk_size // 2:
                end = break_point + 1
                
        chunks.append(text[start:end].strip())
        start = end - overlap
        if start < 0:
            start = end # fallback to prevent infinite loop
    return chunks

def index_meeting(meeting_id: int, title: str, transcript: str, mom_text: str):
    """Chunk and index a meeting's transcript and MoM into ChromaDB."""
    collection = get_meetings_collection()
    if not collection:
        return

    try:
        # Delete existing entries for this meeting to avoid duplicates
        collection.delete(where={"meeting_id": meeting_id})
        
        documents = []
        metadatas = []
        ids = []
        
        # Index MoM
        if mom_text:
            mom_chunks = chunk_text(mom_text, chunk_size=800, overlap=100)
            for i, chunk in enumerate(mom_chunks):
                documents.append(chunk)
                metadatas.append({"meeting_id": meeting_id, "title": title, "type": "mom"})
                ids.append(f"m_{meeting_id}_mom_{i}")
                
        # Index Transcript
        if transcript:
            ts_chunks = chunk_text(transcript, chunk_size=1000, overlap=150)
            for i, chunk in enumerate(ts_chunks):
                documents.append(chunk)
                metadatas.append({"meeting_id": meeting_id, "title": title, "type": "transcript"})
                ids.append(f"m_{meeting_id}_ts_{i}")
                
        if documents:
            collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            logger.info(f"Successfully indexed meeting {meeting_id} with {len(documents)} chunks.")
            
    except Exception as e:
        logger.error(f"Failed to index meeting {meeting_id}: {str(e)}")

def search_meetings(query: str, top_k: int = 5, meeting_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Search for relevant chunks across meetings."""
    try:
        collection = get_meetings_collection()
        if not collection:
            return []
            
        where_clause = {"meeting_id": meeting_id} if meeting_id else None
        
        results = collection.query(
            query_texts=[query],
            n_results=top_k,
            where=where_clause
        )
        
        retrieved = []
        if results and "documents" in results and results["documents"]:
            for i in range(len(results["documents"][0])):
                retrieved.append({
                    "id": results["ids"][0][i],
                    "document": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i] if "distances" in results and results["distances"] else 0.0
                })
        return retrieved
    except Exception as e:
        logger.error(f"Failed to search meetings: {str(e)}")
        return []
