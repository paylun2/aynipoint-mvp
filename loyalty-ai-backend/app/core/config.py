from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Ayniwin AI Backend"
    
    # Supabase Connection
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    
    # PostgreSQL Direct Connection (For SQLAlchemy + asyncpg)
    # Example: postgresql+asyncpg://postgres.[YOUR-PROJECT-REF]:[PASSWORD]@aws-X-XXXXX.pooler.supabase.com:6543/postgres
    DATABASE_URL: str
    
    # OpenAI Settings
    OPENAI_API_KEY: str
    
    class Config:
        env_file = ".env"
        env_file_encoding = 'utf-8'

settings = Settings()
