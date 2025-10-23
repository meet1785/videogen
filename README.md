# VideoGen - AI Video Generation Service

A powerful video generation service that creates videos from text prompts, optimized for Instagram and YouTube content creation. Built with FastAPI and designed for easy integration with n8n automation workflows.

## 🎥 Simple AI Video Generator (Free Codespaces + Hugging Face)

Generate short AI videos directly from GitHub Codespaces for free using the standalone script.

### 🚀 Quick Start (Simple Script)

1. **Fork this repo**
2. **Open in Codespaces**
3. In terminal:
   ```bash
   sudo apt update && sudo apt install -y ffmpeg
   pip install requests
   export HF_TOKEN="your_huggingface_token_here"
   python generate_video.py
   ```

4. Wait ~30 s — you'll get:
   - `base.mp4` → 4 s video from Hugging Face GPU
   - `output_10s.mp4` → 10 s version (looped 3×)

### 🔧 Automate with GitHub Actions

- Add your `HF_TOKEN` in repo → *Settings → Secrets → Actions*
- Trigger the workflow "Generate AI Video" manually.

---

## Full Video Generation Service

For production use with REST API, Docker, and n8n integration, see below:

## Features

- 🎥 Generate videos from text prompts
- 📱 Platform-specific presets (Instagram, YouTube, YouTube Shorts)
- 🔄 Asynchronous video generation with task tracking
- 🚀 RESTful API with comprehensive documentation
- 🔌 n8n webhook integration for automation
- 🐳 Docker support for easy deployment
- 🎨 Customizable video parameters (resolution, FPS, duration)

## Quick Start

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/meet1785/videogen.git
cd videogen
```

2. Build and run with Docker Compose:
```bash
docker-compose up -d
```

3. Access the API at `http://localhost:8000`
   - API Documentation: `http://localhost:8000/docs`
   - Health Check: `http://localhost:8000/api/v1/health`

### Manual Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Copy and configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run the service:
```bash
python -m app.main
```

Or with uvicorn directly:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## API Usage

### Generate a Video

```bash
curl -X POST "http://localhost:8000/api/v1/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over the ocean with waves crashing",
    "platform": "instagram",
    "duration": 5
  }'
```

Response:
```json
{
  "task_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "pending",
  "message": "Video generation task created",
  "created_at": "2025-10-11T03:38:19.773Z"
}
```

### Check Task Status

```bash
curl "http://localhost:8000/api/v1/status/{task_id}"
```

### Download Generated Video

```bash
curl "http://localhost:8000/api/v1/download/{filename}" -o video.mp4
```

## Platform Presets

### Instagram
- Resolution: 1080x1920 (9:16)
- FPS: 30
- Max Duration: 90 seconds

### YouTube Shorts
- Resolution: 1080x1920 (9:16)
- FPS: 30
- Max Duration: 60 seconds

### YouTube (Regular)
- Resolution: 1920x1080 (16:9)
- FPS: 30
- No duration limit

### Default
- Resolution: 1024x576
- FPS: 24
- Duration: 5 seconds

## n8n Integration

This service is designed to work seamlessly with n8n automation workflows.

### Setup in n8n

1. **Add HTTP Request Node**:
   - Method: POST
   - URL: `http://your-server:8000/api/v1/webhook/n8n`
   - Body: JSON
   ```json
   {
     "prompt": "{{$json.prompt}}",
     "platform": "instagram",
     "duration": 5
   }
   ```

2. **Add Wait Node** (optional):
   - Wait for a few seconds to allow video generation

3. **Add HTTP Request Node** to check status:
   - Method: GET
   - URL: `http://your-server:8000/api/v1/status/{{$json.task_id}}`

4. **Add HTTP Request Node** to download video:
   - Method: GET
   - URL: `http://your-server:8000{{$json.video_url}}`

### Example n8n Workflow

See `examples/n8n_workflow.json` for a complete n8n workflow example.

## Configuration

All configuration is done through environment variables (see `.env.example`):

### API Configuration
- `API_HOST`: Server host (default: 0.0.0.0)
- `API_PORT`: Server port (default: 8000)
- `API_KEY`: API key for authentication (optional)
- `ENABLE_AUTH`: Enable API key authentication (default: false)

### Model Configuration
- `DEVICE`: Device to use (cpu or cuda)
- `MODEL_PATH`: Path to store models

### Video Settings
- Custom settings for each platform
- Default video parameters

## API Endpoints

### Core Endpoints

- `GET /` - Root endpoint with service info
- `GET /ping` - Simple health check
- `GET /api/v1/health` - Detailed health check
- `POST /api/v1/generate` - Generate a video
- `GET /api/v1/status/{task_id}` - Check task status
- `GET /api/v1/download/{filename}` - Download video
- `POST /api/v1/webhook/n8n` - n8n webhook endpoint

### Interactive Documentation

Access the interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Advanced Usage

### Custom Video Parameters

```json
{
  "prompt": "A futuristic cityscape at night",
  "negative_prompt": "blurry, low quality",
  "platform": "youtube",
  "duration": 10,
  "width": 1920,
  "height": 1080,
  "fps": 30,
  "seed": 42,
  "num_inference_steps": 50,
  "guidance_scale": 7.5
}
```

### API Authentication

Enable authentication in `.env`:
```
ENABLE_AUTH=true
API_KEY=your-secure-api-key
```

Then include the API key in requests:
```bash
curl -X POST "http://localhost:8000/api/v1/generate" \
  -H "X-API-Key: your-secure-api-key" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "..."}' 
```

## Development

### Running Tests

```bash
pytest tests/
```

### Code Style

```bash
black app/
flake8 app/
```

## Architecture

```
videogen/
├── app/
│   ├── api/          # API routes and endpoints
│   ├── models/       # Pydantic models and schemas
│   ├── services/     # Business logic and video generation
│   ├── utils/        # Utility functions
│   ├── config.py     # Configuration management
│   └── main.py       # FastAPI application
├── outputs/          # Generated videos
├── models/           # AI models
├── temp/             # Temporary files
└── examples/         # Example scripts and workflows
```

## Integrating Real Video Models

The current implementation uses a placeholder video generator. To integrate real video generation models like SkyReels-V2, Stable Video Diffusion, or others:

1. Install the required model dependencies
2. Update `app/services/video_generator.py`
3. Implement the `_generate_video_sync` method with actual model inference
4. Configure model paths in `.env`

Example models you can integrate:
- **SkyReels-V2**: High-quality video generation
- **Stable Video Diffusion**: Stable Diffusion for video
- **ModelScope**: Text-to-video generation
- **Zeroscope**: Video generation model

## Performance Tips

- Use CUDA/GPU for faster generation (`DEVICE=cuda`)
- Adjust `num_inference_steps` for quality vs speed trade-off
- Use Redis for task storage in production
- Implement proper queue management for high load

## Troubleshooting

### Common Issues

1. **Out of Memory**: Reduce video resolution or duration
2. **Slow Generation**: Enable GPU support or reduce inference steps
3. **API Connection Issues**: Check firewall and port settings

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - See LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: https://github.com/meet1785/videogen/issues
- Documentation: http://localhost:8000/docs

## Acknowledgments

- Inspired by SkyReels-V2 and other video generation projects
- Built with FastAPI, PyTorch, and modern ML tools
