# Quick Start Guide

Get VideoGen up and running in 5 minutes!

## Prerequisites

- Python 3.10 or higher (or Docker)
- 4GB RAM minimum (8GB+ recommended)
- 10GB disk space for models (optional, for real video generation)

## Option 1: Docker (Recommended)

### Step 1: Clone the Repository

```bash
git clone https://github.com/meet1785/videogen.git
cd videogen
```

### Step 2: Start the Service

```bash
docker-compose up -d
```

### Step 3: Verify It's Running

```bash
curl http://localhost:8000/api/v1/health
```

You should see:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "device": "cpu",
  "available_platforms": ["instagram", "youtube", "youtube_shorts", "default"]
}
```

### Step 4: Generate Your First Video

```bash
curl -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful sunset over the ocean",
    "platform": "instagram",
    "duration": 5
  }'
```

You'll get a response with a `task_id`. Use it to check status:

```bash
curl http://localhost:8000/api/v1/status/YOUR_TASK_ID
```

When status is `completed`, download your video:

```bash
curl -o video.mp4 http://localhost:8000/api/v1/download/YOUR_TASK_ID.mp4
```

**That's it! 🎉**

---

## Option 2: Manual Installation

### Step 1: Clone and Setup

```bash
git clone https://github.com/meet1785/videogen.git
cd videogen
```

### Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 3: Configure Environment

```bash
cp .env.example .env
# Edit .env if needed
```

### Step 4: Create Directories

```bash
mkdir -p outputs temp models
```

### Step 5: Start the Service

```bash
python -m app.main
```

### Step 6: Test It

Open http://localhost:8000/docs in your browser to see the interactive API documentation.

---

## What's Next?

### Explore the API

Visit http://localhost:8000/docs for interactive API documentation where you can:
- Try all endpoints directly from your browser
- See request/response examples
- Download the OpenAPI specification

### Use Example Scripts

```bash
# Test the API
python examples/test_api.py

# Generate a video with the script
python examples/generate_video.py "Your prompt here" instagram 5 output.mp4
```

### Set Up n8n Automation

1. Install n8n (if not already): https://n8n.io/
2. Import the workflow: `examples/n8n_workflow.json`
3. Configure VideoGen URLs
4. Test the automation

See [N8N_GUIDE.md](N8N_GUIDE.md) for detailed instructions.

### Integrate Real Video Models

The current version uses a placeholder video generator. To use real AI models:

1. Read [INTEGRATION.md](INTEGRATION.md)
2. Choose a model (SkyReels-V2, Stable Video Diffusion, etc.)
3. Install model dependencies
4. Update the video generator service
5. Configure GPU support

### Deploy to Production

Ready to deploy? Check out:
- [DEPLOYMENT.md](DEPLOYMENT.md) - Cloud deployment guides
- [API.md](API.md) - Complete API reference
- [README.md](README.md) - Full documentation

---

## Common Use Cases

### 1. Generate Instagram Reel

```bash
curl -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Vibrant city life at night with neon lights",
    "platform": "instagram",
    "duration": 15,
    "seed": 42
  }'
```

### 2. Generate YouTube Short

```bash
curl -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Quick cooking tutorial showing how to make pasta",
    "platform": "youtube_shorts",
    "duration": 30
  }'
```

### 3. Generate Custom Video

```bash
curl -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Professional product showcase",
    "width": 1920,
    "height": 1080,
    "fps": 60,
    "duration": 10,
    "guidance_scale": 8.0
  }'
```

### 4. Batch Generation

```python
import requests

prompts = [
    "Sunrise over mountains",
    "Ocean waves crashing",
    "Forest path in autumn"
]

for prompt in prompts:
    response = requests.post(
        "http://localhost:8000/api/v1/generate",
        json={"prompt": prompt, "platform": "instagram"}
    )
    print(f"{prompt}: {response.json()['task_id']}")
```

---

## Troubleshooting

### Service won't start

**Check port availability:**
```bash
lsof -i :8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows
```

**Check logs:**
```bash
docker-compose logs videogen  # Docker
# Or check terminal output for manual install
```

### Video generation is slow

- Enable GPU support (set `DEVICE=cuda` in `.env`)
- Reduce video duration
- Lower resolution

### Can't download video

- Make sure video generation completed (`status: "completed"`)
- Check the `video_url` field in status response
- Verify the file exists in `outputs/` directory

### Import errors

```bash
pip install --upgrade -r requirements.txt
```

---

## Configuration

Edit `.env` to customize:

```bash
# Use GPU for faster generation
DEVICE=cuda

# Enable API authentication
ENABLE_AUTH=true
API_KEY=your-secure-key-here

# Adjust video defaults
DEFAULT_WIDTH=1024
DEFAULT_HEIGHT=576
DEFAULT_FPS=24
```

---

## Get Help

- **Documentation:** Check all `.md` files in the repository
- **API Docs:** http://localhost:8000/docs
- **Examples:** See `examples/` directory
- **Issues:** https://github.com/meet1785/videogen/issues

---

## Tips for Success

1. **Start Simple** - Test with short videos first (3-5 seconds)
2. **Monitor Resources** - Video generation is resource-intensive
3. **Use Presets** - Platform presets are optimized for each service
4. **Read Docs** - Check API.md for detailed endpoint documentation
5. **Test Locally** - Verify everything works before deploying
6. **Enable GPU** - Use CUDA for much faster generation
7. **Set Up Monitoring** - Track performance and errors
8. **Backup Configs** - Version control your configuration files

---

## Quick Commands Reference

```bash
# Start service
docker-compose up -d

# Stop service
docker-compose down

# View logs
docker-compose logs -f

# Check health
curl http://localhost:8000/api/v1/health

# Generate video
curl -X POST http://localhost:8000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Your prompt", "platform": "instagram"}'

# Check status
curl http://localhost:8000/api/v1/status/{task_id}

# Download video
curl -o video.mp4 http://localhost:8000/api/v1/download/{filename}

# Restart service
docker-compose restart

# Update and restart
git pull && docker-compose up -d --build
```

---

## What Makes VideoGen Special?

✨ **Easy to Use** - Simple REST API with clear documentation  
🚀 **Fast Setup** - Up and running in minutes  
🔌 **n8n Ready** - Built for automation  
🐳 **Docker Support** - Deploy anywhere  
📱 **Platform Optimized** - Presets for Instagram, YouTube  
🎨 **Customizable** - Full control over video parameters  
📖 **Well Documented** - Comprehensive guides and examples  
🔓 **Open Source** - MIT License, free to use and modify

---

## Ready to Build Something Awesome?

You now have a powerful video generation service at your fingertips. Whether you're:

- 📱 Creating social media content
- 🤖 Building automation workflows
- 🎥 Generating marketing videos
- 🔧 Developing video applications
- 🎨 Experimenting with AI

VideoGen has you covered!

**Happy creating! 🎬**

For more information, see the full [README.md](README.md).
