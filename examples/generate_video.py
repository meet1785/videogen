"""
Example script to generate a video using the VideoGen API.
"""
import requests
import time
import json
import sys

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
API_KEY = None  # Set this if authentication is enabled

def generate_video(prompt, platform="instagram", duration=5):
    """Generate a video from a prompt."""
    print(f"Generating video for prompt: {prompt}")
    
    headers = {
        "Content-Type": "application/json"
    }
    
    if API_KEY:
        headers["X-API-Key"] = API_KEY
    
    data = {
        "prompt": prompt,
        "platform": platform,
        "duration": duration,
        "seed": 42
    }
    
    # Submit generation request
    response = requests.post(
        f"{API_BASE_URL}/generate",
        headers=headers,
        json=data
    )
    
    if response.status_code != 200:
        print(f"Error: {response.text}")
        return None
    
    result = response.json()
    task_id = result["task_id"]
    print(f"Task created: {task_id}")
    
    return task_id


def check_status(task_id):
    """Check the status of a video generation task."""
    response = requests.get(f"{API_BASE_URL}/status/{task_id}")
    
    if response.status_code != 200:
        print(f"Error: {response.text}")
        return None
    
    return response.json()


def wait_for_completion(task_id, max_wait=300):
    """Wait for video generation to complete."""
    print("Waiting for video generation to complete...")
    
    start_time = time.time()
    
    while time.time() - start_time < max_wait:
        status_data = check_status(task_id)
        
        if not status_data:
            return None
        
        status = status_data["status"]
        progress = status_data.get("progress", 0)
        
        print(f"Status: {status} - Progress: {progress}%")
        
        if status == "completed":
            print("Video generation completed!")
            return status_data
        elif status == "failed":
            print(f"Video generation failed: {status_data.get('error')}")
            return None
        
        time.sleep(5)
    
    print("Timeout waiting for video generation")
    return None


def download_video(video_url, output_file):
    """Download the generated video."""
    print(f"Downloading video to {output_file}...")
    
    # Construct full URL
    download_url = f"http://localhost:8000{video_url}"
    
    response = requests.get(download_url, stream=True)
    
    if response.status_code != 200:
        print(f"Error downloading video: {response.text}")
        return False
    
    with open(output_file, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    
    print(f"Video saved to {output_file}")
    return True


def main():
    """Main function."""
    # Example prompts
    prompts = [
        {
            "prompt": "A beautiful sunset over the ocean with waves crashing",
            "platform": "instagram",
            "duration": 5,
            "output": "sunset_instagram.mp4"
        },
        {
            "prompt": "A futuristic cityscape at night with neon lights",
            "platform": "youtube_shorts",
            "duration": 5,
            "output": "cityscape_shorts.mp4"
        }
    ]
    
    # Use command line argument if provided
    if len(sys.argv) > 1:
        custom_prompt = {
            "prompt": sys.argv[1],
            "platform": sys.argv[2] if len(sys.argv) > 2 else "instagram",
            "duration": int(sys.argv[3]) if len(sys.argv) > 3 else 5,
            "output": sys.argv[4] if len(sys.argv) > 4 else "output.mp4"
        }
        prompts = [custom_prompt]
    
    for item in prompts:
        print("\n" + "="*50)
        print(f"Processing: {item['prompt']}")
        print("="*50)
        
        # Generate video
        task_id = generate_video(
            item["prompt"],
            item["platform"],
            item["duration"]
        )
        
        if not task_id:
            continue
        
        # Wait for completion
        result = wait_for_completion(task_id)
        
        if not result:
            continue
        
        # Download video
        video_url = result.get("video_url")
        if video_url:
            download_video(video_url, item["output"])
        
        print(f"✓ Successfully generated {item['output']}")


if __name__ == "__main__":
    main()
