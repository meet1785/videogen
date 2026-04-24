"""Main FastAPI application."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.config import settings
from app.services.database import db_service
from app.utils.rate_limiter import RateLimitMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting Video Generation Service")
    logger.info(f"Device: {settings.device}")
    logger.info(f"Output directory: {settings.output_dir}")
    
    # Initialize database
    logger.info("Initializing database...")
    await db_service.init_db()
    logger.info("Database initialized successfully")
    
    yield
    
    # Cleanup on shutdown
    logger.info("Shutting down Video Generation Service")
    await db_service.close()


# Create FastAPI application
app = FastAPI(
    title="Video Generation Service",
    description="AI-powered video generation service for Instagram and YouTube content",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting (applied after CORS so preflight requests are not limited)
app.add_middleware(RateLimitMiddleware)

# Include API routes
app.include_router(router, prefix="/api/v1", tags=["video-generation"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "Video Generation Service",
        "version": "1.0.0",
        "status": "running",
        "documentation": "/docs"
    }


@app.get("/ping")
async def ping():
    """Simple ping endpoint."""
    return {"status": "pong"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True
    )
