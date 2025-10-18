#!/usr/bin/env python3
"""
Test script for AI Interview Coach Voice API
This script demonstrates the voice-enabled workflow
"""

import requests
import json
import websockets
import asyncio
import base64
import os

# API base URL
BASE_URL = "http://localhost:8000/api"
WS_URL = "ws://localhost:8000/ws"

def test_voice_endpoints():
    """Test the new voice-specific API endpoints"""
    print("🎤 Testing Voice API Endpoints...")
    
    # First, get a demo and create a session
    print("\n1. Getting demo sessions...")
    response = requests.get(f"{BASE_URL}/demos/")
    if response.status_code == 200:
        demos = response.json()
        demo_id = demos[0]['id']
        print(f"✅ Found demo: {demos[0]['title']}")
    else:
        print(f"❌ Error getting demos: {response.status_code}")
        return None
    
    # Create a session by uploading a resume (using existing endpoint)
    print("\n2. Creating interview session...")
    # Create a dummy image for testing
    dummy_image_path = "test_resume.jpg"
    if not os.path.exists(dummy_image_path):
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
            session_id = result['session_id']
            print(f"✅ Session created: {session_id}")
        else:
            print(f"❌ Error creating session: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None
    finally:
        if os.path.exists(dummy_image_path):
            os.remove(dummy_image_path)
    
    # Test voice session status
    print("\n3. Testing voice session status...")
    response = requests.get(f"{BASE_URL}/voice-session/{session_id}/")
    if response.status_code == 200:
        status_data = response.json()
        print(f"✅ Session status retrieved:")
        print(f"   Progress: {status_data['progress_percentage']:.1f}%")
        print(f"   Questions: {status_data['total_questions']}")
        print(f"   Answered: {status_data['answered_questions']}")
    else:
        print(f"❌ Error getting session status: {response.status_code}")
    
    # Test real-time analysis
    print("\n4. Testing real-time analysis...")
    analysis_data = {
        'session_id': session_id,
        'question_index': 0,
        'answer_text': 'I have 3 years of experience as a software engineer, working primarily with Python and Django.'
    }
    response = requests.post(f"{BASE_URL}/realtime-analysis/", json=analysis_data)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Real-time analysis received:")
        print(f"   Feedback: {result['analysis']['feedback']}")
        print(f"   Confidence: {result['analysis']['confidence']}")
        print(f"   Word count: {result['analysis']['word_count']}")
    else:
        print(f"❌ Error getting real-time analysis: {response.status_code}")
    
    return session_id

async def test_websocket_connection(session_id):
    """Test WebSocket connection for real-time voice processing"""
    print(f"\n🔌 Testing WebSocket Connection for session {session_id}...")
    
    try:
        uri = f"{WS_URL}/interview/{session_id}/"
        print(f"Connecting to: {uri}")
        
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected!")
            
            # Test connection message
            connection_msg = await websocket.recv()
            connection_data = json.loads(connection_msg)
            print(f"📨 Connection message: {connection_data['message']}")
            
            # Test start recording
            print("\n🎤 Testing start recording...")
            start_recording = {
                'type': 'start_recording',
                'question_index': 0
            }
            await websocket.send(json.dumps(start_recording))
            
            # Wait for response
            response = await websocket.recv()
            response_data = json.loads(response)
            print(f"📨 Recording started: {response_data['message']}")
            
            # Test audio chunk (simulated)
            print("\n🎵 Testing audio chunk processing...")
            # Create dummy audio data (base64 encoded)
            dummy_audio = base64.b64encode(b"dummy audio data").decode('utf-8')
            
            audio_chunk = {
                'type': 'audio_chunk',
                'question_index': 0,
                'audio_data': dummy_audio
            }
            await websocket.send(json.dumps(audio_chunk))
            
            # Wait for partial transcription
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                response_data = json.loads(response)
                print(f"📨 Partial transcription: {response_data.get('transcription', 'No transcription')}")
            except asyncio.TimeoutError:
                print("⏰ No response to audio chunk (expected for placeholder)")
            
            # Test stop recording
            print("\n⏹️ Testing stop recording...")
            stop_recording = {
                'type': 'stop_recording',
                'question_index': 0,
                'audio_data': dummy_audio
            }
            await websocket.send(json.dumps(stop_recording))
            
            # Wait for final transcription
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                response_data = json.loads(response)
                print(f"📨 Final transcription: {response_data.get('transcription', 'No transcription')}")
            except asyncio.TimeoutError:
                print("⏰ No response to stop recording (expected for placeholder)")
            
            # Test real-time analysis
            print("\n🤖 Testing real-time analysis...")
            analysis_request = {
                'type': 'get_analysis',
                'question_index': 0,
                'answer_text': 'This is a test answer for real-time analysis.'
            }
            await websocket.send(json.dumps(analysis_request))
            
            # Wait for analysis
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                response_data = json.loads(response)
                print(f"📨 Real-time analysis: {response_data.get('analysis', 'No analysis')}")
            except asyncio.TimeoutError:
                print("⏰ No response to analysis request (expected for placeholder)")
            
            print("\n✅ WebSocket test completed!")
            
    except Exception as e:
        print(f"❌ WebSocket error: {e}")

def main():
    """Run all voice API tests"""
    print("🎤 AI Interview Coach Voice API Test Suite")
    print("=" * 50)
    
    # Test voice endpoints
    session_id = test_voice_endpoints()
    
    if session_id:
        # Test WebSocket connection
        print(f"\n🔌 Testing WebSocket for session: {session_id}")
        try:
            asyncio.run(test_websocket_connection(session_id))
        except Exception as e:
            print(f"❌ WebSocket test failed: {e}")
    
    print("\n🎉 Voice API tests completed!")
    print("\n📝 Note: This is a backend implementation. Frontend integration would handle:")
    print("   - Real audio recording from microphone")
    print("   - WebSocket connection management")
    print("   - Real-time UI updates")
    print("   - Audio file uploads")

if __name__ == "__main__":
    main()
