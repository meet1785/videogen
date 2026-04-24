"""Video generation service."""
import os
import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any
import asyncio
from concurrent.futures import ThreadPoolExecutor

import httpx
import numpy as np
from PIL import Image
import imageio

from app.config import settings, get_video_settings
from app.models.schemas import VideoGenerationRequest
from app.services.database import db_service

logger = logging.getLogger(__name__)


class VideoGenerationService:
    """Service for generating videos from text prompts."""
    
    def __init__(self):
        """Initialize the video generation service."""
        self.device = settings.device
        self.model_path = settings.model_path
        self.output_dir = settings.output_dir
        self.temp_dir = settings.temp_dir
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.db = db_service
        
        # Create output directories
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.temp_dir, exist_ok=True)
        
        logger.info(f"VideoGenerationService initialized with device: {self.device}")
    
    async def generate_video(self, request: VideoGenerationRequest) -> str:
        """
        Generate a video from a text prompt.
        
        Args:
            request: Video generation request
            
        Returns:
            Task ID for tracking the generation progress
        """
        task_id = str(uuid.uuid4())
        
        # Get platform-specific settings
        platform_settings = get_video_settings(request.platform)
        
        # Override with request parameters if provided
        width = request.width or platform_settings["width"]
        height = request.height or platform_settings["height"]
        fps = request.fps or platform_settings["fps"]
        duration = request.duration or settings.default_duration
        
        # Validate duration limits
        if platform_settings.get("max_duration") and duration > platform_settings["max_duration"]:
            duration = platform_settings["max_duration"]
        
        # Create task in database
        await self.db.create_task(
            task_id=task_id,
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            platform=request.platform,
            width=width,
            height=height,
            fps=fps,
            duration=duration,
            seed=request.seed,
            num_inference_steps=request.num_inference_steps,
            guidance_scale=request.guidance_scale,
            webhook_url=request.webhook_url
        )
        
        # Start generation in background
        asyncio.create_task(self._generate_video_async(
            task_id, request.prompt, request.negative_prompt,
            width, height, fps, duration,
            request.seed, request.num_inference_steps, request.guidance_scale,
            request.webhook_url
        ))
        
        return task_id
    
    async def _generate_video_async(
        self,
        task_id: str,
        prompt: str,
        negative_prompt: Optional[str],
        width: int,
        height: int,
        fps: int,
        duration: int,
        seed: Optional[int],
        num_inference_steps: int,
        guidance_scale: float,
        webhook_url: Optional[str] = None
    ):
        """Generate video asynchronously."""
        try:
            # Update status to processing
            await self.db.update_task(
                task_id,
                status="processing",
                message="Generating video...",
                progress=10
            )
            
            logger.info(f"Starting video generation for task {task_id}")
            
            # Run generation in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            video_path = await loop.run_in_executor(
                self.executor,
                self._generate_video_sync,
                task_id, prompt, negative_prompt, width, height, fps, duration, seed
            )
            
            video_url = f"/api/v1/download/{os.path.basename(video_path)}"

            # Update task as completed
            await self.db.update_task(
                task_id,
                status="completed",
                message="Video generated successfully",
                progress=100,
                video_url=video_url,
                video_path=video_path,
                completed=True
            )
            
            logger.info(f"Video generation completed for task {task_id}")

            # Fire webhook notification if configured
            await self._notify_webhook(webhook_url, task_id, "completed", video_url=video_url)
            
        except Exception as e:
            logger.error(f"Error generating video for task {task_id}: {str(e)}")
            await self.db.update_task(
                task_id,
                status="failed",
                message="Video generation failed",
                error=str(e),
                completed=True
            )
            await self._notify_webhook(webhook_url, task_id, "failed", error=str(e))
    
    def _generate_video_sync(
        self,
        task_id: str,
        prompt: str,
        negative_prompt: Optional[str],
        width: int,
        height: int,
        fps: int,
        duration: int,
        seed: Optional[int]
    ) -> str:
        """
        Synchronous video generation (placeholder implementation).
        
        In production, this should use actual video generation models like:
        - Stable Video Diffusion
        - ModelScope
        - ZerosScope
        - Or the SkyReels model
        """
        # Set random seed for reproducibility
        if seed is not None:
            np.random.seed(seed)
        
        # Generate frames (placeholder: colored noise based on prompt)
        num_frames = fps * duration
        frames = []
        
        # Simple color generation based on prompt keywords
        color = self._get_color_from_prompt(prompt)
        
        for i in range(num_frames):
            # Create a frame with animated gradient
            frame = np.zeros((height, width, 3), dtype=np.uint8)
            
            # Add animated effect
            offset = int((i / num_frames) * 255)
            for y in range(height):
                for x in range(width):
                    frame[y, x] = [
                        (color[0] + offset + x // 10) % 256,
                        (color[1] + offset + y // 10) % 256,
                        (color[2] + offset + (x + y) // 20) % 256
                    ]
            
            frames.append(frame)
            
            # Note: Fine-grained progress tracking removed from sync function
            # In production with real model inference, progress should be tracked
            # via model callbacks or by running this as async with periodic updates
        
        # Save video
        output_path = os.path.join(self.output_dir, f"{task_id}.mp4")
        
        writer = imageio.get_writer(output_path, fps=fps, codec='libx264', quality=8)
        for frame in frames:
            writer.append_data(frame)
        writer.close()
        
        logger.info(f"Video saved to {output_path}")
        return output_path
    
    def _get_color_from_prompt(self, prompt: str) -> tuple:
        """Get a base color from prompt keywords."""
        prompt_lower = prompt.lower()
        
        color_map = {
            'red': (255, 50, 50),
            'blue': (50, 50, 255),
            'green': (50, 255, 50),
            'yellow': (255, 255, 50),
            'purple': (200, 50, 255),
            'orange': (255, 150, 50),
            'pink': (255, 100, 200),
            'ocean': (50, 100, 255),
            'sunset': (255, 100, 50),
            'forest': (50, 150, 50),
            'sky': (100, 150, 255),
        }
        
        for keyword, color in color_map.items():
            if keyword in prompt_lower:
                return color
        
        # Default color
        return (100, 100, 200)
    
    async def _notify_webhook(
        self,
        webhook_url: Optional[str],
        task_id: str,
        status: str,
        video_url: Optional[str] = None,
        error: Optional[str] = None
    ):
        """POST a completion notification to the caller's webhook URL.

        Payload schema::

            {
                "task_id": str,          # UUID of the task
                "status":  str,          # "completed" or "failed"
                "video_url": str | None, # download path, populated on success
                "error":   str | None    # error message, populated on failure
            }
        """
        if not webhook_url:
            return
        if not self._is_safe_webhook_url(webhook_url):
            logger.warning(
                f"Webhook URL rejected for task {task_id}: "
                "URL must use http/https and cannot target a private network address."
            )
            return
        payload = {
            "task_id": task_id,
            "status": status,
            "video_url": video_url,
            "error": error,
        }
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_url,
                    json=payload,
                    timeout=settings.webhook_timeout
                )
            logger.info(
                f"Webhook notified for task {task_id}: "
                f"status={response.status_code}"
            )
        except Exception as exc:
            logger.warning(
                f"Webhook notification failed for task {task_id}: {exc}"
            )

    @staticmethod
    def _is_safe_webhook_url(url: str) -> bool:
        """Return True only when *url* is a safe, public http/https URL.

        Rejects:
        - Non-http/https schemes (e.g. file://, ftp://)
        - Loopback addresses (127.0.0.0/8, ::1)
        - Private RFC-1918 ranges (10/8, 172.16/12, 192.168/16)
        - Link-local addresses (169.254/16)
        - Unspecified host
        """
        import ipaddress
        from urllib.parse import urlparse

        try:
            parsed = urlparse(url)
        except Exception:
            return False

        if parsed.scheme not in {"http", "https"}:
            return False

        host = parsed.hostname
        if not host:
            return False

        # Reject well-known local names
        if host.lower() in {"localhost", "localhos"}:
            return False

        try:
            addr = ipaddress.ip_address(host)
            if (
                addr.is_loopback
                or addr.is_private
                or addr.is_link_local
                or addr.is_unspecified
                or addr.is_reserved
            ):
                return False
        except ValueError:
            # Not an IP literal — hostname-based URLs are allowed
            pass

        return True

    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a video generation task."""
        task = await self.db.get_task(task_id)
        if task:
            return task.to_dict()
        return None
    
    async def cleanup_old_tasks(self, days: int = 7):
        """Clean up old completed tasks."""
        count = await self.db.delete_old_tasks(days=days)
        logger.info(f"Cleaned up {count} old tasks")


# Global service instance
video_service = VideoGenerationService()
