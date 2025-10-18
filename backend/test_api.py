#!/usr/bin/env python3
"""
Test script for AI Interview Coach API
This script demonstrates the complete workflow of the API
"""

import requests
import json
import os

# API base URL
BASE_URL = "http://localhost:8000/api"

def test_demo_list():
    """Test GET /api/demos/ endpoint"""
    print("🔍 Testing Demo List Endpoint...")
    response = requests.get(f"{BASE_URL}/demos/")
    
    if response.status_code == 200:
        demos = response.json()
        print(f"✅ Found {len(demos)} demo sessions:")
        for demo in demos:
            print(f"  - {demo['title']}: {demo['description']}")
        return demos[0]['id'] if demos else None
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return None

def test_upload_resume(demo_id):
    """Test POST /api/upload-resume/ endpoint"""
    print("\n📄 Testing Resume Upload Endpoint...")
    
    # Create a dummy image file for testing
    dummy_image_path = "test_resume.jpg"
    if not os.path.exists(dummy_image_path):
        print("⚠️  No test image found. Creating a dummy file...")
        # Create a simple 1x1 pixel image
        from PIL import Image
        img = Image.new('RGB', (100, 100), color='white')
        img.save(dummy_image_path)
    
    try:
        with open(dummy_image_path, 'rb') as f:
            files = {'resume_image': f}
            data = {'demo_id': demo_id}
            response = requests.post(f"{BASE_URL}/upload-resume/", files=files, data=data)
        
        if response.status_code == 201:
            result = response.json()
            print(f"✅ Resume uploaded successfully!")
            print(f"   Session ID: {result['session_id']}")
            print(f"   Questions generated: {len(result['questions'])}")
            for i, question in enumerate(result['questions'], 1):
                print(f"   {i}. {question}")
            return result['session_id']
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error uploading resume: {e}")
        return None
    finally:
        # Clean up dummy image
        if os.path.exists(dummy_image_path):
            os.remove(dummy_image_path)

def test_submit_answers(session_id):
    """Test POST /api/submit-answers/ endpoint"""
    print("\n💬 Testing Answer Submission Endpoint...")
    
    # Sample answers
    answers = [
        {"answer": "I have 3 years of experience as a software engineer, working primarily with Python and Django. I've built several web applications and have experience with both frontend and backend development."},
        {"answer": "I believe in clear communication and setting expectations early. I use tools like Slack for daily communication and hold regular standup meetings to ensure everyone is aligned."},
        {"answer": "When I needed to learn React for a new project, I started with the official documentation, built small practice projects, and joined online communities. I also paired with experienced developers on my team."},
        {"answer": "I have extensive experience with Python and Django. I've built REST APIs, worked with databases, implemented authentication systems, and deployed applications to production."},
        {"answer": "I start by reproducing the issue in a controlled environment, then use debugging tools and logging to trace the problem. I also check recent changes and collaborate with team members when needed."}
    ]
    
    data = {
        "session_id": session_id,
        "answers": answers
    }
    
    response = requests.post(f"{BASE_URL}/submit-answers/", json=data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Answers submitted successfully!")
        print(f"   Message: {result['message']}")
        return True
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return False

def test_analyze_answers(session_id):
    """Test POST /api/analyze/ endpoint"""
    print("\n🤖 Testing Analysis Endpoint...")
    
    data = {"session_id": session_id}
    response = requests.post(f"{BASE_URL}/analyze/", json=data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Analysis completed successfully!")
        print(f"   Session ID: {result['session_id']}")
        print(f"   Results: {len(result['results'])} question analyses")
        
        for i, analysis in enumerate(result['results'], 1):
            print(f"\n   Question {i}: {analysis['question']}")
            print(f"   Verbal Score: {analysis['verbal_score']}/10")
            if 'design_score' in analysis:
                print(f"   Design Score: {analysis['design_score']}/10")
            print(f"   Feedback: {analysis['feedback']}")
        
        return True
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
        return False

def main():
    """Run all API tests"""
    print("🧠 AI Interview Coach API Test Suite")
    print("=" * 50)
    
    # Test 1: Get demo list
    demo_id = test_demo_list()
    if not demo_id:
        print("❌ Cannot proceed without demo sessions")
        return
    
    # Test 2: Upload resume (this will use fallback questions since no Gemini API key)
    session_id = test_upload_resume(demo_id)
    if not session_id:
        print("❌ Cannot proceed without session")
        return
    
    # Test 3: Submit answers
    if not test_submit_answers(session_id):
        print("❌ Cannot proceed without answers")
        return
    
    # Test 4: Analyze answers
    test_analyze_answers(session_id)
    
    print("\n🎉 All tests completed!")
    print("\n📝 Note: To use Gemini AI features, set your GEMINI_API_KEY in the .env file")

if __name__ == "__main__":
    main()
