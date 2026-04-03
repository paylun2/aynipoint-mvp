from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.api.health import router as health_router
from app.api.ai import router as ai_router

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Ayniwin AI Backend",
    description="Motor transaccional y cerebral de Ayniwin B2B2C",
    version="1.0.0"
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.ayniwin.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "Ayniwin AI Engine running under Python 3.13"}

# Register API Routers
app.include_router(health_router, prefix="/api/v1", tags=["system"])
app.include_router(ai_router, prefix="/api/v1/ai", tags=["ai-engine"])
