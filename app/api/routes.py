"""API endpoints for video generation."""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Header
from fastapi.responses import FileResponse
import os

from app.models.schemas import (
    VideoGenerationRequest,
    VideoGenerationResponse,
    TaskStatusResponse,
    HealthResponse
)
from app.services.video_generator import video_service
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """Verify API key if authentication is enabled."""
    if settings.enable_auth:
        if not x_api_key or x_api_key != settings.api_key:
            raise HTTPException(status_code=401, detail="Invalid API key")


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        device=settings.device,
        available_platforms=["instagram", "youtube", "youtube_shorts", "default"]
    )


@router.post("/generate", response_model=VideoGenerationResponse, dependencies=[])
async def generate_video(
    request: VideoGenerationRequest,
    background_tasks: BackgroundTasks,
    x_api_key: Optional[str] = Header(None)
):
    """
    Generate a video from a text prompt.
    
    This endpoint creates a video generation task and returns immediately with a task ID.
    Use the /status/{task_id} endpoint to check the progress and get the video URL when ready.
    """
    if settings.enable_auth:
        verify_api_key(x_api_key)
    
    try:
        task_id = await video_service.generate_video(request)
        
        return VideoGenerationResponse(
            task_id=task_id,
            status="pending",
            message="Video generation task created",
            created_at=video_service.tasks[task_id]["created_at"]
        )
    except Exception as e:
        logger.error(f"Error creating video generation task: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """Get the status of a video generation task."""
    task_info = video_service.get_task_status(task_id)
    
    if not task_info:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return TaskStatusResponse(
        task_id=task_id,
        status=task_info["status"],
        progress=task_info.get("progress"),
        message=task_info["message"],
        video_url=task_info.get("video_url"),
        error=task_info.get("error"),
        created_at=task_info["created_at"],
        completed_at=task_info.get("completed_at")
    )


@router.get("/download/{filename}")
async def download_video(filename: str):
    """Download a generated video file."""
    file_path = os.path.join(settings.output_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    return FileResponse(
        file_path,
        media_type="video/mp4",
        filename=filename
    )


@router.post("/webhook/n8n")
async def n8n_webhook(
    request: VideoGenerationRequest,
    x_api_key: Optional[str] = Header(None)
):
    """
    Webhook endpoint for n8n automation.
    
    This endpoint is specifically designed for n8n integration.
    It accepts the same parameters as /generate but can be configured
    with custom authentication for n8n workflows.
    """
    if settings.enable_auth:
        verify_api_key(x_api_key)
    
    try:
        task_id = await video_service.generate_video(request)
        task_info = video_service.get_task_status(task_id)
        
        return {
            "success": True,
            "task_id": task_id,
            "status": "pending",
            "message": "Video generation task created successfully",
            "poll_url": f"/status/{task_id}",
            "created_at": task_info["created_at"]
        }
    except Exception as e:
        logger.error(f"Error in n8n webhook: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
