# API Documentation

Complete API reference for the VideoGen service.

## Base URL

```
http://localhost:8000
```

## Authentication

The API supports optional API key authentication. When enabled, include the API key in the request header:

```http
X-API-Key: your-api-key-here
```

## Endpoints

### 1. Root Endpoint

Get basic service information.

**Endpoint:** `GET /`

**Response:**
```json
{
  "service": "Video Generation Service",
  "version": "1.0.0",
  "status": "running",
  "documentation": "/docs"
}
```

---

### 2. Health Check

Get detailed service health information.

**Endpoint:** `GET /api/v1/health`

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "device": "cuda",
  "available_platforms": [
    "instagram",
    "youtube",
    "youtube_shorts",
    "default"
  ]
}
```

**Response Fields:**
- `status` (string): Service health status
- `version` (string): API version
- `device` (string): Device being used (cuda/cpu)
- `available_platforms` (array): Supported platform presets

---

### 3. Generate Video

Create a new video generation task.

**Endpoint:** `POST /api/v1/generate`

**Request Body:**
```json
{
  "prompt": "A beautiful sunset over the ocean with waves crashing",
  "negative_prompt": "blurry, low quality, distorted",
  "platform": "instagram",
  "duration": 5,
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "seed": 42,
  "num_inference_steps": 50,
  "guidance_scale": 7.5
}
```

**Request Fields:**
- `prompt` (string, required): Text description of the video to generate
- `negative_prompt` (string, optional): What to avoid in the video
- `platform` (string, optional): Target platform preset (default: "default")
  - Options: `instagram`, `youtube`, `youtube_shorts`, `default`
- `duration` (integer, optional): Video duration in seconds
- `width` (integer, optional): Video width in pixels
- `height` (integer, optional): Video height in pixels
- `fps` (integer, optional): Frames per second
- `seed` (integer, optional): Random seed for reproducibility
- `num_inference_steps` (integer, optional): Number of inference steps (default: 50)
- `guidance_scale` (float, optional): Guidance scale for generation (default: 7.5)

**Response:**
```json
{
  "task_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "message": "Video generation task created",
  "video_url": null,
  "created_at": "2025-10-11T03:38:19.773Z",
  "completed_at": null,
  "metadata": null
}
```

**Response Fields:**
- `task_id` (string): Unique identifier for tracking the task
- `status` (string): Current task status (pending/processing/completed/failed)
- `message` (string): Human-readable status message
- `video_url` (string, nullable): URL to download the video (available when completed)
- `created_at` (string): ISO 8601 timestamp of task creation
- `completed_at` (string, nullable): ISO 8601 timestamp of task completion
- `metadata` (object, nullable): Additional task metadata

**Status Codes:**
- `200 OK`: Task created successfully
- `401 Unauthorized`: Invalid or missing API key
- `422 Unprocessable Entity`: Invalid request parameters
- `500 Internal Server Error`: Server error

---

### 4. Get Task Status

Check the status of a video generation task.

**Endpoint:** `GET /api/v1/status/{task_id}`

**Path Parameters:**
- `task_id` (string, required): The task ID returned from the generate endpoint

**Response:**
```json
{
  "task_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "progress": 100.0,
  "message": "Video generated successfully",
  "video_url": "/download/123e4567-e89b-12d3-a456-426614174000.mp4",
  "error": null,
  "created_at": "2025-10-11T03:38:19.773Z",
  "completed_at": "2025-10-11T03:40:25.891Z"
}
```

**Response Fields:**
- `task_id` (string): Task identifier
- `status` (string): Current status
  - `pending`: Task created, waiting to start
  - `processing`: Video generation in progress
  - `completed`: Video generated successfully
  - `failed`: Generation failed
- `progress` (float, nullable): Progress percentage (0-100)
- `message` (string): Status message
- `video_url` (string, nullable): Download URL when completed
- `error` (string, nullable): Error message if failed
- `created_at` (string): Task creation timestamp
- `completed_at` (string, nullable): Task completion timestamp

**Status Codes:**
- `200 OK`: Status retrieved successfully
- `404 Not Found`: Task ID not found

---

### 5. Download Video

Download a generated video file.

**Endpoint:** `GET /api/v1/download/{filename}`

**Path Parameters:**
- `filename` (string, required): The filename from the video_url field

**Response:**
- Binary video file (MP4 format)
- Content-Type: `video/mp4`

**Status Codes:**
- `200 OK`: Video file returned
- `404 Not Found`: Video file not found

**Example:**
```bash
curl -o video.mp4 http://localhost:8000/api/v1/download/123e4567-e89b-12d3-a456-426614174000.mp4
```

---

### 6. n8n Webhook

Special endpoint optimized for n8n automation workflows.

**Endpoint:** `POST /api/v1/webhook/n8n`

**Request Body:** Same as the generate endpoint

**Response:**
```json
{
  "success": true,
  "task_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "message": "Video generation task created successfully",
  "poll_url": "/status/123e4567-e89b-12d3-a456-426614174000",
  "created_at": "2025-10-11T03:38:19.773Z"
}
```

**Response Fields:**
- `success` (boolean): Whether the request was successful
- `task_id` (string): Task identifier
- `status` (string): Initial task status
- `message` (string): Status message
- `poll_url` (string): Relative URL for polling task status
- `created_at` (string): Task creation timestamp

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## Platform Presets

### Instagram
```json
{
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "max_duration": 90
}
```

### YouTube Shorts
```json
{
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "max_duration": 60
}
```

### YouTube (Regular)
```json
{
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "max_duration": null
}
```

### Default
```json
{
  "width": 1024,
  "height": 576,
  "fps": 24,
  "max_duration": null
}
```

---

## Code Examples

### Python

```python
import requests
import time

API_URL = "http://localhost:8000/api/v1"

# Generate video
response = requests.post(
    f"{API_URL}/generate",
    json={
        "prompt": "A beautiful sunset over mountains",
        "platform": "instagram",
        "duration": 5
    }
)

task_id = response.json()["task_id"]
print(f"Task ID: {task_id}")

# Poll for completion
while True:
    status_response = requests.get(f"{API_URL}/status/{task_id}")
    status_data = status_response.json()
    
    print(f"Status: {status_data['status']} - {status_data.get('progress', 0)}%")
    
    if status_data["status"] == "completed":
        video_url = status_data["video_url"]
        print(f"Video ready: {video_url}")
        break
    elif status_data["status"] == "failed":
        print(f"Failed: {status_data.get('error')}")
        break
    
    time.sleep(5)

# Download video
video_response = requests.get(f"http://localhost:8000{video_url}")
with open("output.mp4", "wb") as f:
    f.write(video_response.content)
```

### JavaScript

```javascript
const API_URL = 'http://localhost:8000/api/v1';

async function generateVideo() {
  // Generate video
  const response = await fetch(`${API_URL}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: 'A beautiful sunset over mountains',
      platform: 'instagram',
      duration: 5
    })
  });
  
  const { task_id } = await response.json();
  console.log(`Task ID: ${task_id}`);
  
  // Poll for completion
  while (true) {
    const statusResponse = await fetch(`${API_URL}/status/${task_id}`);
    const statusData = await statusResponse.json();
    
    console.log(`Status: ${statusData.status} - ${statusData.progress || 0}%`);
    
    if (statusData.status === 'completed') {
      console.log(`Video ready: ${statusData.video_url}`);
      return statusData.video_url;
    } else if (statusData.status === 'failed') {
      throw new Error(statusData.error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

generateVideo()
  .then(url => console.log('Done:', url))
  .catch(err => console.error('Error:', err));
```

### cURL

```bash
# Generate video
TASK_ID=$(curl -s -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over mountains",
    "platform": "instagram",
    "duration": 5
  }' | jq -r '.task_id')

echo "Task ID: $TASK_ID"

# Check status
curl http://localhost:8000/api/v1/status/$TASK_ID

# Download video (when completed)
curl -o video.mp4 http://localhost:8000/api/v1/download/${TASK_ID}.mp4
```

---

## Error Handling

### Error Response Format

```json
{
  "detail": "Error message here"
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request format
- `401 Unauthorized`: Missing or invalid API key
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation error
- `500 Internal Server Error`: Server error

### Validation Errors

```json
{
  "detail": [
    {
      "loc": ["body", "prompt"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Rate Limiting

The API does not implement rate limiting by default, but you can add it using middleware or a reverse proxy like Nginx.

**Example with Nginx:**
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://videogen;
}
```

---

## Webhooks

The service can send webhook notifications when videos are completed (configure in `.env`):

```bash
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/video-complete
N8N_AUTH_TOKEN=your-token
```

**Webhook Payload:**
```json
{
  "task_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "video_url": "/download/123e4567-e89b-12d3-a456-426614174000.mp4",
  "prompt": "Original prompt",
  "platform": "instagram",
  "created_at": "2025-10-11T03:38:19.773Z",
  "completed_at": "2025-10-11T03:40:25.891Z"
}
```

---

## Interactive Documentation

The API includes interactive documentation powered by Swagger UI and ReDoc:

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

These interfaces allow you to:
- Browse all available endpoints
- View request/response schemas
- Test API calls directly from the browser
- Download OpenAPI specification

---

## Best Practices

1. **Always poll for status** - Video generation can take time
2. **Use webhooks for production** - More efficient than polling
3. **Handle timeouts gracefully** - Video generation can take 1-5 minutes
4. **Validate inputs** - Ensure prompts and parameters are valid
5. **Implement retries** - Network issues can occur
6. **Monitor task status** - Check for failures and handle appropriately
7. **Use platform presets** - They're optimized for each platform
8. **Set appropriate timeouts** - At least 5 minutes for video generation
9. **Cache completed videos** - Don't regenerate the same content
10. **Use API keys in production** - Enable authentication for security

---

## Support

- **Documentation:** http://localhost:8000/docs
- **GitHub Issues:** https://github.com/meet1785/videogen/issues
- **Examples:** Check the `examples/` directory
