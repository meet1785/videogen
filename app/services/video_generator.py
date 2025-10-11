"""Video generation service."""
import os
import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any
import asyncio
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image
import imageio

from app.config import settings, get_video_settings
from app.models.schemas import VideoGenerationRequest

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
        
        # Create output directories
        os.makedirs(self.output_dir, exist_ok=True)
        os.makedirs(self.temp_dir, exist_ok=True)
        
        # Task storage (in production, use Redis or database)
        self.tasks: Dict[str, Dict[str, Any]] = {}
        
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
        
        # Store task information
        self.tasks[task_id] = {
            "status": "pending",
            "progress": 0,
            "message": "Task created",
            "created_at": datetime.utcnow().isoformat(),
            "request": request.dict(),
            "video_url": None,
            "error": None
        }
        
        # Start generation in background
        asyncio.create_task(self._generate_video_async(
            task_id, request.prompt, request.negative_prompt,
            width, height, fps, duration,
            request.seed, request.num_inference_steps, request.guidance_scale
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
        guidance_scale: float
    ):
        """Generate video asynchronously."""
        try:
            self.tasks[task_id]["status"] = "processing"
            self.tasks[task_id]["message"] = "Generating video..."
            self.tasks[task_id]["progress"] = 10
            
            logger.info(f"Starting video generation for task {task_id}")
            
            # Run generation in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            video_path = await loop.run_in_executor(
                self.executor,
                self._generate_video_sync,
                task_id, prompt, negative_prompt, width, height, fps, duration, seed
            )
            
            self.tasks[task_id]["status"] = "completed"
            self.tasks[task_id]["message"] = "Video generated successfully"
            self.tasks[task_id]["progress"] = 100
            self.tasks[task_id]["video_url"] = f"/download/{os.path.basename(video_path)}"
            self.tasks[task_id]["completed_at"] = datetime.utcnow().isoformat()
            
            logger.info(f"Video generation completed for task {task_id}")
            
        except Exception as e:
            logger.error(f"Error generating video for task {task_id}: {str(e)}")
            self.tasks[task_id]["status"] = "failed"
            self.tasks[task_id]["message"] = "Video generation failed"
            self.tasks[task_id]["error"] = str(e)
            self.tasks[task_id]["completed_at"] = datetime.utcnow().isoformat()
    
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
            
            # Update progress
            progress = 10 + int((i / num_frames) * 80)
            self.tasks[task_id]["progress"] = progress
        
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
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a video generation task."""
        return self.tasks.get(task_id)
    
    def cleanup_old_tasks(self, max_age_hours: int = 24):
        """Clean up old completed tasks."""
        current_time = datetime.utcnow()
        tasks_to_remove = []
        
        for task_id, task_info in self.tasks.items():
            if task_info["status"] in ["completed", "failed"]:
                created_at = datetime.fromisoformat(task_info["created_at"])
                age_hours = (current_time - created_at).total_seconds() / 3600
                
                if age_hours > max_age_hours:
                    tasks_to_remove.append(task_id)
        
        for task_id in tasks_to_remove:
            del self.tasks[task_id]
            logger.info(f"Cleaned up old task: {task_id}")


# Global service instance
video_service = VideoGenerationService()
