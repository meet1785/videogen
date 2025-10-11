"""
Test script to verify the API is working correctly.
"""
import requests
import sys

def test_health():
    """Test the health endpoint."""
    print("Testing health endpoint...")
    response = requests.get("http://localhost:8000/api/v1/health")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Health check passed")
        print(f"  Status: {data['status']}")
        print(f"  Version: {data['version']}")
        print(f"  Device: {data['device']}")
        print(f"  Platforms: {', '.join(data['available_platforms'])}")
        return True
    else:
        print(f"✗ Health check failed: {response.status_code}")
        return False

def test_ping():
    """Test the ping endpoint."""
    print("\nTesting ping endpoint...")
    response = requests.get("http://localhost:8000/ping")
    
    if response.status_code == 200:
        print(f"✓ Ping successful: {response.json()}")
        return True
    else:
        print(f"✗ Ping failed: {response.status_code}")
        return False

def test_generate():
    """Test video generation."""
    print("\nTesting video generation...")
    
    data = {
        "prompt": "Test video",
        "platform": "default",
        "duration": 2
    }
    
    response = requests.post(
        "http://localhost:8000/api/v1/generate",
        json=data
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✓ Video generation request accepted")
        print(f"  Task ID: {result['task_id']}")
        print(f"  Status: {result['status']}")
        return True
    else:
        print(f"✗ Video generation failed: {response.status_code}")
        print(f"  Response: {response.text}")
        return False

def main():
    """Run all tests."""
    print("="*50)
    print("VideoGen API Test Suite")
    print("="*50)
    
    results = []
    
    try:
        results.append(("Health", test_health()))
        results.append(("Ping", test_ping()))
        results.append(("Generate", test_generate()))
    except requests.exceptions.ConnectionError:
        print("\n✗ Cannot connect to API. Is the service running?")
        print("  Run: python -m app.main")
        sys.exit(1)
    
    print("\n" + "="*50)
    print("Test Results")
    print("="*50)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status} - {name}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n✓ All tests passed!")
        sys.exit(0)
    else:
        print("\n✗ Some tests failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
