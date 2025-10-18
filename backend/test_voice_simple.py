#!/usr/bin/env python3
"""
Simple test for voice API endpoints
"""

import requests
import json

# Test the basic API first
print("🧠 Testing Basic API...")
response = requests.get("http://localhost:8000/api/demos/")
if response.status_code == 200:
    print("✅ Basic API working")
    demos = response.json()
    demo_id = demos[0]['id']
    print(f"   Demo ID: {demo_id}")
else:
    print(f"❌ Basic API failed: {response.status_code}")
    exit(1)

# Create a session
print("\n📄 Creating session...")
# Create a dummy image for testing
from PIL import Image
import os

dummy_image_path = "test_resume.jpg"
img = Image.new('RGB', (100, 100), color='white')
img.save(dummy_image_path)

try:
    with open(dummy_image_path, 'rb') as f:
        files = {'resume_image': f}
        data = {'demo_id': demo_id}
        response = requests.post("http://localhost:8000/api/upload-resume/", files=files, data=data)
    
    if response.status_code == 201:
        result = response.json()
        session_id = result['session_id']
        print(f"✅ Session created: {session_id}")
    else:
        print(f"❌ Session creation failed: {response.status_code} - {response.text}")
        exit(1)
finally:
    if os.path.exists(dummy_image_path):
        os.remove(dummy_image_path)

# Test voice session status
print(f"\n🎤 Testing voice session status for {session_id}...")
response = requests.get(f"http://localhost:8000/api/voice-session/{session_id}/")
print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    data = response.json()
    print("✅ Voice session status retrieved:")
    print(f"   Progress: {data['progress_percentage']:.1f}%")
    print(f"   Questions: {data['total_questions']}")
    print(f"   Answered: {data['answered_questions']}")
else:
    print(f"❌ Voice session status failed: {response.text}")

# Test real-time analysis
print(f"\n🤖 Testing real-time analysis...")
analysis_data = {
    'session_id': session_id,
    'question_index': 0,
    'answer_text': 'I have 3 years of experience as a software engineer.'
}
response = requests.post("http://localhost:8000/api/realtime-analysis/", json=analysis_data)
print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    result = response.json()
    print("✅ Real-time analysis received:")
    print(f"   Feedback: {result['analysis']['feedback']}")
    print(f"   Confidence: {result['analysis']['confidence']}")
else:
    print(f"❌ Real-time analysis failed: {response.text}")

print("\n🎉 Voice API test completed!")
