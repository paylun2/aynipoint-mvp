from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from uuid import UUID

class KnowledgeChunkCreate(BaseModel):
    content: str = Field(..., description="El texto o regla de negocio a vectorizar e indexar.")
    org_id: Optional[UUID] = Field(None, description="Si es nulo, el conocimiento se considera GLOBAL del sistema. Si tiene UUID, es privado de la empresa.")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadata adicional para filtros (ej: {'type': 'sop', 'area': 'caja'})")

class KnowledgeChunkResponse(BaseModel):
    id: UUID
    org_id: Optional[UUID]
    content: str
    metadata: Dict[str, Any]
    
    class Config:
        from_attributes = True
