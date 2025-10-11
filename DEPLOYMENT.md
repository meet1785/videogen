# Deployment Guide

This guide covers different deployment options for the VideoGen service.

## Table of Contents
- [Docker Deployment](#docker-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Production Considerations](#production-considerations)
- [Monitoring and Logging](#monitoring-and-logging)

## Docker Deployment

### Basic Deployment

1. **Build and run with Docker Compose:**
```bash
docker-compose up -d
```

2. **Check logs:**
```bash
docker-compose logs -f videogen
```

3. **Stop the service:**
```bash
docker-compose down
```

### Custom Configuration

Create a custom `docker-compose.override.yml`:

```yaml
version: '3.8'

services:
  videogen:
    environment:
      - DEVICE=cuda
      - API_WORKERS=8
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

## Cloud Deployment

### AWS (ECS/Fargate)

1. **Build and push Docker image:**
```bash
# Build the image
docker build -t videogen:latest .

# Tag for ECR
docker tag videogen:latest YOUR_ECR_REGISTRY/videogen:latest

# Push to ECR
docker push YOUR_ECR_REGISTRY/videogen:latest
```

2. **Create ECS Task Definition:**
```json
{
  "family": "videogen",
  "containerDefinitions": [
    {
      "name": "videogen",
      "image": "YOUR_ECR_REGISTRY/videogen:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "API_HOST", "value": "0.0.0.0"},
        {"name": "API_PORT", "value": "8000"},
        {"name": "DEVICE", "value": "cpu"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/videogen",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "2048",
  "memory": "4096"
}
```

### Google Cloud (Cloud Run)

1. **Deploy to Cloud Run:**
```bash
gcloud run deploy videogen \
  --image gcr.io/YOUR_PROJECT/videogen:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --set-env-vars "DEVICE=cpu,API_HOST=0.0.0.0"
```

### Azure (Container Instances)

1. **Deploy to Azure:**
```bash
az container create \
  --resource-group videogen-rg \
  --name videogen \
  --image YOUR_ACR/videogen:latest \
  --cpu 2 \
  --memory 4 \
  --ports 8000 \
  --environment-variables \
    DEVICE=cpu \
    API_HOST=0.0.0.0 \
    API_PORT=8000
```

### DigitalOcean (App Platform)

Create an `app.yaml`:

```yaml
name: videogen
services:
  - name: api
    github:
      repo: meet1785/videogen
      branch: main
      deploy_on_push: true
    dockerfile_path: Dockerfile
    http_port: 8000
    instance_count: 1
    instance_size_slug: professional-m
    envs:
      - key: DEVICE
        value: cpu
      - key: API_HOST
        value: 0.0.0.0
```

## Production Considerations

### 1. Environment Variables

Always set these in production:

```bash
# Security
ENABLE_AUTH=true
API_KEY=your-very-secure-api-key-here

# Performance
API_WORKERS=4
DEVICE=cuda  # If GPU available

# Storage
OUTPUT_DIR=/app/outputs
TEMP_DIR=/app/temp

# n8n Integration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/callback
N8N_AUTH_TOKEN=your-n8n-token
```

### 2. Persistent Storage

Mount volumes for outputs:

```yaml
volumes:
  - ./outputs:/app/outputs
  - ./models:/app/models
```

For cloud deployments, use object storage:
- **AWS**: S3
- **GCP**: Cloud Storage
- **Azure**: Blob Storage

### 3. Load Balancing

Use a reverse proxy like Nginx:

```nginx
upstream videogen {
    server videogen:8000;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://videogen;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Increase timeouts for video generation
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }
}
```

### 4. HTTPS/SSL

Use Certbot or cloud-managed certificates:

```bash
# With Certbot
certbot --nginx -d api.yourdomain.com
```

### 5. Task Queue (Production)

For production, use Redis + Celery:

```python
# requirements.txt additions
celery==5.3.4
redis==5.0.1

# celery_app.py
from celery import Celery

celery_app = Celery(
    'videogen',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

@celery_app.task
def generate_video_task(task_id, prompt, ...):
    # Video generation logic
    pass
```

### 6. Database for Task Storage

Use PostgreSQL or MongoDB instead of in-memory storage:

```python
# With PostgreSQL
from sqlalchemy import create_engine

engine = create_engine('postgresql://user:pass@localhost/videogen')
```

## Monitoring and Logging

### Application Logging

Configure structured logging:

```python
import logging
import json

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': record.module,
        }
        return json.dumps(log_obj)

handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logging.root.addHandler(handler)
```

### Metrics Collection

Use Prometheus:

```python
from prometheus_client import Counter, Histogram, generate_latest

video_requests = Counter('video_requests_total', 'Total video requests')
video_duration = Histogram('video_generation_duration_seconds', 'Video generation duration')

@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

### Health Checks

The service includes health check endpoints:
- `/ping` - Simple ping
- `/api/v1/health` - Detailed health status

Configure Kubernetes liveness/readiness probes:

```yaml
livenessProbe:
  httpGet:
    path: /ping
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/v1/health
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Error Tracking

Integrate Sentry:

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="your-sentry-dsn",
    integrations=[FastApiIntegration()]
)
```

## Scaling

### Horizontal Scaling

Run multiple instances behind a load balancer:

```yaml
# docker-compose.yml
services:
  videogen:
    image: videogen:latest
    deploy:
      replicas: 4
```

### Vertical Scaling

Increase resources per instance:
- CPU: 4-8 cores recommended
- RAM: 8-16GB minimum
- GPU: NVIDIA GPU with 8GB+ VRAM for ML models

### Queue-Based Scaling

Use auto-scaling based on queue length:

```yaml
# AWS ECS Auto Scaling
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/videogen/videogen-service"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}
```

## Backup and Disaster Recovery

### 1. Database Backups

```bash
# Automated backup script
pg_dump videogen > backup_$(date +%Y%m%d).sql
aws s3 cp backup_*.sql s3://backups/videogen/
```

### 2. Configuration Backups

Version control all configuration:
```bash
git add .env docker-compose.yml
git commit -m "Update production config"
```

### 3. Model Backups

Sync models to object storage:
```bash
aws s3 sync ./models/ s3://videogen-models/
```

## Security Checklist

- [ ] Enable API key authentication
- [ ] Use HTTPS/TLS
- [ ] Set up firewall rules
- [ ] Implement rate limiting
- [ ] Regular security updates
- [ ] Scan Docker images for vulnerabilities
- [ ] Use secrets management (AWS Secrets Manager, etc.)
- [ ] Enable CORS properly
- [ ] Validate all inputs
- [ ] Implement request size limits

## Performance Optimization

### 1. Caching

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def get_model():
    # Load and cache model
    pass
```

### 2. Connection Pooling

```python
# For database connections
engine = create_engine(
    'postgresql://...',
    pool_size=20,
    max_overflow=0
)
```

### 3. CDN for Videos

Use CloudFront, Cloudflare, or similar for video delivery.

## Troubleshooting

### Service won't start
```bash
# Check logs
docker-compose logs videogen

# Check ports
netstat -tlnp | grep 8000
```

### Out of memory
```bash
# Increase Docker memory
docker-compose down
docker-compose up -d --scale videogen=2
```

### Slow video generation
- Enable GPU
- Reduce video resolution
- Optimize inference steps

## Support

For deployment issues:
- Check logs: `docker-compose logs -f`
- Review documentation: http://localhost:8000/docs
- GitHub Issues: https://github.com/meet1785/videogen/issues
