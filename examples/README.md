# VideoGen Examples

This directory contains example scripts and workflows for using the VideoGen service.

## Files

### `generate_video.py`
Python script to generate videos using the API.

**Usage:**
```bash
python examples/generate_video.py
```

Or with custom parameters:
```bash
python examples/generate_video.py "Your prompt here" instagram 5 output.mp4
```

### `test_api.py`
Test script to verify the API is working correctly.

**Usage:**
```bash
python examples/test_api.py
```

### `n8n_workflow.json`
Complete n8n workflow for automated video generation.

**Import to n8n:**
1. Open n8n
2. Click "Import from File"
3. Select `n8n_workflow.json`
4. Configure the HTTP Request nodes with your server URL
5. Activate the workflow

**Test the workflow:**
```bash
curl -X POST "http://your-n8n-instance:5678/webhook/video-request" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful landscape",
    "platform": "instagram",
    "duration": 5
  }'
```

## n8n Automation Use Cases

### 1. Scheduled Content Creation
Create a workflow that generates videos on a schedule (e.g., daily Instagram posts).

### 2. RSS Feed to Video
Convert RSS feed articles into videos automatically.

### 3. Social Media Automation
Generate videos and automatically post them to Instagram/YouTube.

### 4. Content Generation Pipeline
- Fetch trending topics
- Generate video prompts using AI
- Create videos using VideoGen
- Post to multiple platforms

## Advanced Examples

### Batch Video Generation
```python
import requests

prompts = [
    "A sunrise over mountains",
    "Ocean waves at sunset",
    "City lights at night"
]

for i, prompt in enumerate(prompts):
    response = requests.post(
        "http://localhost:8000/api/v1/generate",
        json={
            "prompt": prompt,
            "platform": "instagram",
            "duration": 5
        }
    )
    print(f"Video {i+1}: {response.json()['task_id']}")
```

### Platform-Specific Generation
```python
platforms = {
    "instagram": {"width": 1080, "height": 1920},
    "youtube": {"width": 1920, "height": 1080},
    "youtube_shorts": {"width": 1080, "height": 1920}
}

for platform, settings in platforms.items():
    response = requests.post(
        "http://localhost:8000/api/v1/generate",
        json={
            "prompt": "Beautiful nature scene",
            "platform": platform,
            "duration": 5
        }
    )
    print(f"{platform}: {response.json()['task_id']}")
```
