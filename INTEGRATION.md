# SkyReels-V2 Integration Guide

This guide explains how to integrate the SkyReels-V2 model or similar video generation models into the VideoGen service.

## Overview

The current implementation uses a placeholder video generator that creates animated gradient videos. To integrate real video generation models, you'll need to modify the `VideoGenerationService` class.

## Supported Models

You can integrate various video generation models:

1. **SkyReels-V2** - High-quality video generation from SkyworkAI
2. **Stable Video Diffusion** - From Stability AI
3. **ModelScope** - Text-to-video generation
4. **Zeroscope** - Video generation model
5. **AnimateDiff** - Animation generation

## Integration Steps

### 1. Install Model Dependencies

For Stable Video Diffusion or similar models:

```bash
pip install torch torchvision diffusers transformers accelerate safetensors
```

For SkyReels-V2, follow their specific installation instructions.

### 2. Download Model Weights

```python
from diffusers import StableVideoDiffusionPipeline
import torch

# Download and cache the model
pipe = StableVideoDiffusionPipeline.from_pretrained(
    "stabilityai/stable-video-diffusion-img2vid-xt",
    torch_dtype=torch.float16,
    variant="fp16"
)
pipe.save_pretrained("./models/stable-video-diffusion")
```

### 3. Update the Video Generator

Replace the `_generate_video_sync` method in `app/services/video_generator.py`:

```python
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
    """Generate video using real model."""
    import torch
    from diffusers import StableVideoDiffusionPipeline
    
    # Load model (cache this in __init__ for production)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    pipe = StableVideoDiffusionPipeline.from_pretrained(
        self.model_path,
        torch_dtype=torch.float16 if device == "cuda" else torch.float32
    )
    pipe.to(device)
    
    # Set seed
    if seed is not None:
        generator = torch.Generator(device=device).manual_seed(seed)
    else:
        generator = None
    
    # Generate video
    num_frames = fps * duration
    
    # For text-to-video models, generate directly from prompt
    # For image-to-video models, first generate an image from prompt
    
    output = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        num_frames=num_frames,
        height=height,
        width=width,
        generator=generator
    )
    
    # Save frames as video
    frames = output.frames[0]
    output_path = os.path.join(self.output_dir, f"{task_id}.mp4")
    
    import imageio
    writer = imageio.get_writer(output_path, fps=fps, codec='libx264')
    for frame in frames:
        writer.append_data(np.array(frame))
    writer.close()
    
    return output_path
```

### 4. Optimize for Production

#### Model Caching
Load models once during initialization:

```python
class VideoGenerationService:
    def __init__(self):
        self.device = settings.device
        self.model_path = settings.model_path
        
        # Load model once
        self.pipe = self._load_model()
    
    def _load_model(self):
        """Load the video generation model."""
        from diffusers import StableVideoDiffusionPipeline
        import torch
        
        pipe = StableVideoDiffusionPipeline.from_pretrained(
            self.model_path,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32
        )
        pipe.to(self.device)
        
        # Optimizations
        pipe.enable_attention_slicing()
        if self.device == "cuda":
            pipe.enable_model_cpu_offload()
        
        return pipe
```

#### Memory Management

```python
import gc
import torch

def _generate_video_sync(self, ...):
    # ... generation code ...
    
    # Clean up after generation
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    gc.collect()
```

### 5. Configure Environment

Update `.env`:

```bash
# Use CUDA if available
DEVICE=cuda

# Model path
MODEL_PATH=./models/stable-video-diffusion

# Adjust settings for model capabilities
DEFAULT_WIDTH=512
DEFAULT_HEIGHT=512
DEFAULT_FPS=24
```

## SkyReels-V2 Specific Integration

For SkyReels-V2, refer to their repository: https://github.com/SkyworkAI/SkyReels-V2

```python
# Example integration (adjust based on actual SkyReels-V2 API)
from skyreels import SkyReelsV2Pipeline

class VideoGenerationService:
    def __init__(self):
        # ... existing code ...
        self.pipe = SkyReelsV2Pipeline.from_pretrained(
            "skywork/skyreels-v2",
            device=self.device
        )
    
    def _generate_video_sync(self, task_id, prompt, ...):
        output = self.pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_frames=fps * duration,
            width=width,
            height=height,
            fps=fps
        )
        
        # Save video
        output_path = os.path.join(self.output_dir, f"{task_id}.mp4")
        output.save(output_path)
        return output_path
```

## Performance Optimization

### 1. Use GPU
```bash
DEVICE=cuda
```

### 2. Reduce Inference Steps
```python
num_inference_steps=25  # Instead of 50
```

### 3. Use Smaller Models
- Use quantized models (int8, int4)
- Use distilled models when available

### 4. Batch Processing
Process multiple videos in parallel if GPU memory allows.

### 5. Queue System
Implement a proper queue system for production:

```python
from celery import Celery
from redis import Redis

# Use Celery for task queue
celery_app = Celery('videogen', broker='redis://localhost:6379')

@celery_app.task
def generate_video_task(task_id, prompt, ...):
    # ... generation code ...
```

## Testing

Test the integrated model:

```bash
python examples/test_api.py
python examples/generate_video.py "Test prompt" instagram 5
```

## Troubleshooting

### Out of Memory
- Reduce video resolution
- Reduce number of frames
- Use CPU instead of GPU for testing
- Enable attention slicing: `pipe.enable_attention_slicing()`

### Slow Generation
- Use GPU (CUDA)
- Reduce inference steps
- Use fp16 precision
- Enable model optimizations

### Model Not Found
- Check model path in `.env`
- Ensure model is downloaded
- Verify model compatibility

## Additional Resources

- [Diffusers Documentation](https://huggingface.co/docs/diffusers)
- [SkyReels-V2 Repository](https://github.com/SkyworkAI/SkyReels-V2)
- [Stable Video Diffusion](https://stability.ai/stable-video)
- [ModelScope Text-to-Video](https://huggingface.co/damo-vilab/text-to-video-ms-1.7b)

## Support

For integration help:
- Check the model's documentation
- Review example notebooks
- Open an issue in the repository
