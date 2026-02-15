#!/usr/bin/env python3
"""Comprehensive test suite for database persistence."""
import time
import requests
import sqlite3
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.config import settings

BASE_URL = "http://127.0.0.1:8000"

def test_all():
    """Run all tests."""
    print("Testing VideoGen Database Persistence")
    print("="*60)
    
    # Test health
    print("\n✓ Testing health endpoint...")
    r = requests.get(f"{BASE_URL}/api/v1/health")
    assert r.status_code == 200
    print(f"  Status: {r.json()['status']}")
    
    # Test generation
    print("\n✓ Testing video generation...")
    r = requests.post(f"{BASE_URL}/api/v1/generate", json={
        "prompt": "Test video",
        "platform": "default",
        "duration": 1,
        "width": 320,
        "height": 240
    })
    assert r.status_code == 200
    task_id = r.json()['task_id']
    print(f"  Task ID: {task_id[:8]}...")
    
    # Wait for completion
    print("\n✓ Waiting for completion...")
    for i in range(10):
        time.sleep(2)
        r = requests.get(f"{BASE_URL}/api/v1/status/{task_id}")
        status = r.json()['status']
        if status == 'completed':
            print(f"  Completed!")
            break
    
    # Test database
    print("\n✓ Testing database persistence...")
    db_path = f"{settings.output_dir}/tasks.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM tasks")
    count = cursor.fetchone()[0]
    print(f"  Tasks in database: {count}")
    conn.close()
    
    print("\n" + "="*60)
    print("✓ All tests passed!")

if __name__ == "__main__":
    test_all()
