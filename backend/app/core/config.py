from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Application settings.
    """
    DATABASE_URL: str = "sqlite:///./family_recognition.db"
    
    # Security Configuration - should be set via environment variables
    SECRET_KEY: str = "change-this-secret-key-in-production"  # Override via .env file
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # RAG Configuration
    GEMINI_API_KEY: str = ""
    FAISS_INDEX_PATH: str = "./faiss_indexes"
    CHUNK_SIZE: int = 1000
    MAX_CONTEXT_LENGTH: int = 3000
    SIMILARITY_THRESHOLD: float = 0.3
    MIN_CONTEXT_RESULTS: int = 1


    DISTRESS_MESSAGE_TEMPLATE: str = "This is an automated distress call for {username}. They may be in danger and need immediate assistance."

    # Email (SMTP) distress notifications
    SMTP_HOST: str = ""
    SMTP_PORT: int = 465
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    # SendGrid HTTP API (fallback when SMTP ports are blocked)
    SENDGRID_API_KEY: str = ""


    
    class Config:
        env_file = ".env"


settings = Settings()
