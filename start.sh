#!/bin/bash
# Quick start script for VideoGen service

echo "🎬 Starting VideoGen Service..."

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "✓ Docker found"
    echo "Starting with Docker Compose..."
    docker-compose up -d
    
    echo ""
    echo "Waiting for service to start..."
    sleep 5
    
    # Check if service is running
    if curl -s http://localhost:8000/ping > /dev/null; then
        echo "✓ Service is running!"
        echo ""
        echo "📚 API Documentation: http://localhost:8000/docs"
        echo "🏥 Health Check: http://localhost:8000/api/v1/health"
        echo ""
        echo "Example request:"
        echo 'curl -X POST "http://localhost:8000/api/v1/generate" \'
        echo '  -H "Content-Type: application/json" \'
        echo '  -d '"'"'{"prompt": "A beautiful sunset", "platform": "instagram"}'"'"
    else
        echo "❌ Service failed to start. Check logs with: docker-compose logs"
    fi
else
    echo "❌ Docker not found. Installing manually..."
    
    # Check if Python is installed
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python 3 is required but not installed."
        exit 1
    fi
    
    echo "Installing dependencies..."
    pip install -r requirements.txt
    
    echo "Creating directories..."
    mkdir -p outputs temp models
    
    echo "Copying environment file..."
    if [ ! -f .env ]; then
        cp .env.example .env
    fi
    
    echo "Starting service..."
    python -m app.main &
    
    echo ""
    echo "Service starting in background..."
    echo "Wait a few seconds, then visit: http://localhost:8000/docs"
fi
