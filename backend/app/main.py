from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from .db import database
from .models import models
from .routers import auth, family, quiz, rag, distress

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="Empathetic Family Recognition Aid API",
    description="The backend for the Empathetic Family Recognition Aid application.",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Mount the 'uploads' directory so that images can be served statically
# Use the same path resolution as in family_service.py
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.include_router(auth.router)
app.include_router(family.router)
app.include_router(quiz.router)
app.include_router(rag.router)
app.include_router(distress.router)


@app.get("/")
def read_root():
    """
    A simple health-check endpoint to confirm the API is running.
    """
    return {"status": "ok", "message": "Welcome to the Family Recognition Aid API!"}
