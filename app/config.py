"""Configuration module for the video generation service."""
import os
from typing import Optional
from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_workers: int = 4
    
    # Model Configuration
    model_path: str = "models/"
    device: str = "cpu"  # cuda or cpu
    
    # Video Generation Settings
    default_width: int = 1024
    default_height: int = 576
    default_fps: int = 24
    default_duration: int = 5
    
    # Instagram Settings
    instagram_width: int = 1080
    instagram_height: int = 1920
    instagram_fps: int = 30
    instagram_max_duration: int = 90
    
    # YouTube Settings (Shorts)
    youtube_shorts_width: int = 1080
    youtube_shorts_height: int = 1920
    youtube_shorts_fps: int = 30
    youtube_shorts_max_duration: int = 60
    
    # YouTube Settings (Regular)
    youtube_width: int = 1920
    youtube_height: int = 1080
    youtube_fps: int = 30
    
    # Storage
    output_dir: str = "outputs/"
    temp_dir: str = "temp/"
    
    # API Security
    api_key: Optional[str] = None
    enable_auth: bool = False
    
    # n8n Integration
    n8n_webhook_url: Optional[str] = None
    n8n_auth_token: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_video_settings(platform: str = "default"):
    """Get video settings for a specific platform."""
    platform = platform.lower()
    
    if platform == "instagram":
        return {
            "width": settings.instagram_width,
            "height": settings.instagram_height,
            "fps": settings.instagram_fps,
            "max_duration": settings.instagram_max_duration,
        }
    elif platform == "youtube_shorts":
        return {
            "width": settings.youtube_shorts_width,
            "height": settings.youtube_shorts_height,
            "fps": settings.youtube_shorts_fps,
            "max_duration": settings.youtube_shorts_max_duration,
        }
    elif platform == "youtube":
        return {
            "width": settings.youtube_width,
            "height": settings.youtube_height,
            "fps": settings.youtube_fps,
            "max_duration": None,
        }
    else:
        return {
            "width": settings.default_width,
            "height": settings.default_height,
            "fps": settings.default_fps,
            "max_duration": None,
        }
