from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from models.schemas import ChatRequest, ChatResponse, DocumentsResponse, UploadResponse
from services.pdf_processor import PDFProcessor
from services.vector_store import VectorStoreService
from services.rag_pipeline import RAGPipeline
from config import settings
import logging
import time
import os
import uuid
from typing import List

# Configure logging
logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RAG-based Financial Statement Q&A System",
    description="AI-powered Q&A system for financial documents using RAG",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
pdf_processor = PDFProcessor()
vector_store = VectorStoreService(
    endpoint=settings.vector_db_endpoint,
    api_key=settings.vector_db_api_key
)
rag_pipeline = RAGPipeline(
    llm_endpoint=settings.llm_endpoint,
    vector_store=vector_store
)

# In-memory document store (replace with database in production)
processed_documents = {}

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting RAG Q&A System...")
    try:
        await vector_store.initialize()
        logger.info("Vector store initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize vector store: {str(e)}")
        raise

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "RAG-based Financial Statement Q&A System is running"}

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)) -> UploadResponse:
    """Upload and process PDF file"""
    # 1. Validate file type (PDF)
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # 2. Save uploaded file temporarily
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_id = str(uuid.uuid4())
    file_path = os.path.join(upload_dir, f"{file_id}.pdf")
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        
        # 3. Process PDF and extract text
        logger.info(f"Processing PDF: {file.filename}")
        start_time = time.time()
        document = pdf_processor.process_pdf(file_path)
        
        # 4. Store documents in vector database
        chunks = await vector_store.ingest_document(document)
        processing_time = time.time() - start_time
        
        # Store document metadata
        processed_documents[file_id] = {
            "filename": file.filename,
            "pages": len(document.pages),
            "chunks": len(chunks),
            "upload_time": time.time(),
            "file_path": file_path
        }
        
        # 5. Return processing results
        return UploadResponse(
            success=True,
            document_id=file_id,
            filename=file.filename,
            pages=len(document.pages),
            chunks=len(chunks),
            processing_time=round(processing_time, 2)
        )
            
    except Exception as e:
        logger.error(f"Error processing PDF: {str(e)}")
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
    finally:
        # Cleanup if needed
        pass

@app.post("/api/chat")
async def chat(request: ChatRequest) -> ChatResponse:
    """Process chat request and return AI response"""
    # 1. Validate request
    if not request.question or not request.document_id:
        raise HTTPException(status_code=400, detail="Question and document_id are required")
    
    if request.document_id not in processed_documents:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        # 2. Use RAG pipeline to generate answer
        logger.info(f"Processing question: {request.question}")
        start_time = time.time()
        
        result = await rag_pipeline.query(
            question=request.question,
            document_id=request.document_id,
            top_k=request.top_k or 3
        )
        
        processing_time = time.time() - start_time
        
        # 3. Return response with sources
        return ChatResponse(
            success=True,
            answer=result.answer,
            sources=result.sources,
            processing_time=round(processing_time, 2)
        )
    except Exception as e:
        logger.error(f"Error processing question: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

@app.get("/api/documents")
async def get_documents() -> DocumentsResponse:
    """Get list of processed documents"""
    try:
        documents = [
            {
                "document_id": doc_id,
                "filename": doc["filename"],
                "pages": doc["pages"],
                "chunks": doc["chunks"],
                "upload_time": doc["upload_time"]
            }
            for doc_id, doc in processed_documents.items()
        ]
        return DocumentsResponse(
            success=True,
            count=len(documents),
            documents=documents
        )
    except Exception as e:
        logger.error(f"Error retrieving documents: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving documents: {str(e)}")

@app.get("/api/chunks")
async def get_chunks(document_id: str, page: int = 1, limit: int = 10) -> JSONResponse:
    """Get document chunks (optional endpoint)"""
    if document_id not in processed_documents:
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        chunks = await vector_store.get_document_chunks(
            document_id=document_id,
            page=page,
            limit=limit
        )
        return JSONResponse({
            "success": True,
            "document_id": document_id,
            "chunks": chunks,
            "page": page,
            "limit": limit
        })
    except Exception as e:
        logger.error(f"Error retrieving chunks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving chunks: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port, reload=settings.debug)