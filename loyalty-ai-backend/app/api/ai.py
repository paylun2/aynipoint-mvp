from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from openai import AsyncOpenAI
from app.core.database import get_db, set_rls_context
from app.core.config import settings
from app.schemas.ai import KnowledgeChunkCreate, KnowledgeChunkResponse
from app.models.ai import AIKnowledgeBase

router = APIRouter()
# Initialize OpenAI Client (Async)
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

@router.post("/knowledge", response_model=KnowledgeChunkResponse, status_code=201)
async def create_knowledge_chunk(
    chunk: KnowledgeChunkCreate,
    x_org_id: Optional[str] = Header(None, description="Inyectado por el API Gateway (Next.js) para Multi-Tenant RLS"),
    x_user_id: Optional[str] = Header(None, description="Inyectado por el API Gateway (Next.js)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Ingiere texto plano, genera su representación vectorial (Embedding) con OpenAI,
    y lo almacena de forma segura en la jaula RLS de PostgreSQL (pgvector).
    """
    # 1. Enforce RLS Context if headers are present
    if x_user_id or x_org_id:
        await set_rls_context(db, user_id=x_user_id, org_id=x_org_id)
        
    try:
        # 2. Call OpenAI api to generate the embedding
        response = await openai_client.embeddings.create(
            input=[chunk.content],
            model="text-embedding-3-small"
        )
        
        vector = response.data[0].embedding
        
        # 3. Create the database record
        new_knowledge = AIKnowledgeBase(
            org_id=chunk.org_id,
            content=chunk.content,
            embedding=vector,
            metadata_col=chunk.metadata
        )
        
        db.add(new_knowledge)
        await db.commit()
        await db.refresh(new_knowledge)
        
        return new_knowledge
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error AI Engine: {str(e)}")
