import json
import asyncio
import base64
import io
import tempfile
import os
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings
import google.generativeai as genai
from .models import InterviewSession

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)

class InterviewConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time interview voice processing"""
    
    async def connect(self):
        """Accept WebSocket connection"""
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'interview_{self.session_id}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'message': 'Connected to interview session',
            'session_id': self.session_id
        }))

    async def disconnect(self, close_code):
        """Leave room group when disconnected"""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'start_recording':
                await self.handle_start_recording(data)
            elif message_type == 'audio_chunk':
                await self.handle_audio_chunk(data)
            elif message_type == 'stop_recording':
                await self.handle_stop_recording(data)
            elif message_type == 'get_analysis':
                await self.handle_get_analysis(data)
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'Unknown message type: {message_type}'
                }))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Server error: {str(e)}'
            }))

    async def handle_start_recording(self, data):
        """Handle start of audio recording"""
        question_index = data.get('question_index', 0)
        
        await self.send(text_data=json.dumps({
            'type': 'recording_started',
            'question_index': question_index,
            'message': 'Recording started. Speak now.'
        }))

    async def handle_audio_chunk(self, data):
        """Handle real-time audio chunks"""
        audio_data = data.get('audio_data')
        question_index = data.get('question_index', 0)
        
        if audio_data:
            # Process audio chunk for real-time transcription
            transcription = await self.process_audio_chunk(audio_data)
            
            if transcription:
                await self.send(text_data=json.dumps({
                    'type': 'partial_transcription',
                    'transcription': transcription,
                    'question_index': question_index,
                    'confidence': 0.8  # Placeholder confidence
                }))

    async def handle_stop_recording(self, data):
        """Handle end of audio recording"""
        audio_data = data.get('audio_data')
        question_index = data.get('question_index', 0)
        
        if audio_data:
            # Process complete audio for final transcription
            final_transcription = await self.process_complete_audio(audio_data)
            
            if final_transcription:
                # Save the answer to the session
                await self.save_answer(question_index, final_transcription)
                
                await self.send(text_data=json.dumps({
                    'type': 'recording_completed',
                    'transcription': final_transcription,
                    'question_index': question_index,
                    'message': 'Answer recorded successfully'
                }))

    async def handle_get_analysis(self, data):
        """Handle request for real-time analysis"""
        question_index = data.get('question_index', 0)
        answer_text = data.get('answer_text', '')
        
        if answer_text:
            # Get real-time analysis
            analysis = await self.get_realtime_analysis(answer_text, question_index)
            
            await self.send(text_data=json.dumps({
                'type': 'realtime_analysis',
                'analysis': analysis,
                'question_index': question_index
            }))

    async def process_audio_chunk(self, audio_data):
        """Process audio chunk for partial transcription"""
        try:
            # Decode base64 audio data
            audio_bytes = base64.b64decode(audio_data)
            
            # For now, return a placeholder transcription
            # In production, you'd use Google Speech-to-Text streaming API
            return "Speaking..."  # Placeholder for real-time feedback
            
        except Exception as e:
            print(f"Error processing audio chunk: {e}")
            return None

    async def process_complete_audio(self, audio_data):
        """Process complete audio for final transcription"""
        try:
            # Decode base64 audio data
            audio_bytes = base64.b64decode(audio_data)
            
            # Save audio to temporary file
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
                temp_file.write(audio_bytes)
                temp_file_path = temp_file.name
            
            # Transcribe using Gemini or Google Speech-to-Text
            transcription = await self.transcribe_audio(temp_file_path)
            
            # Clean up temporary file
            os.unlink(temp_file_path)
            
            return transcription
            
        except Exception as e:
            print(f"Error processing complete audio: {e}")
            return None

    async def transcribe_audio(self, audio_file_path):
        """Transcribe audio file using Gemini or fallback"""
        try:
            # For now, use a simple fallback transcription
            # In production, integrate with Google Speech-to-Text API
            return "This is a placeholder transcription. In production, this would use Google Speech-to-Text API to convert the audio to text."
            
        except Exception as e:
            print(f"Error transcribing audio: {e}")
            return "Could not transcribe audio. Please try again."

    async def save_answer(self, question_index, answer_text):
        """Save answer to the interview session"""
        try:
            session = await self.get_session()
            if session:
                # Get current answers
                answers = session.answers if session.answers else []
                
                # Ensure answers list is long enough
                while len(answers) <= question_index:
                    answers.append({'answer': ''})
                
                # Update the specific answer
                answers[question_index] = {'answer': answer_text}
                
                # Save back to session
                await self.update_session_answers(session, answers)
                
        except Exception as e:
            print(f"Error saving answer: {e}")

    async def get_realtime_analysis(self, answer_text, question_index):
        """Get real-time analysis of the answer"""
        try:
            # Use Gemini for quick analysis
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = f"""
            Provide a quick analysis of this interview answer:
            
            Answer: {answer_text}
            
            Give:
            1. A brief feedback (1-2 sentences)
            2. A confidence score (1-10)
            3. Any suggestions for improvement
            
            Keep it concise for real-time display.
            """
            
            response = model.generate_content(prompt)
            
            return {
                'feedback': response.text,
                'confidence': 8,  # Placeholder
                'suggestions': ['Consider adding more specific examples']
            }
            
        except Exception as e:
            print(f"Error getting real-time analysis: {e}")
            return {
                'feedback': 'Good answer! Keep going.',
                'confidence': 7,
                'suggestions': []
            }

    @database_sync_to_async
    def get_session(self):
        """Get interview session from database"""
        try:
            return InterviewSession.objects.get(id=self.session_id)
        except InterviewSession.DoesNotExist:
            return None

    @database_sync_to_async
    def update_session_answers(self, session, answers):
        """Update session answers in database"""
        session.answers = answers
        session.save()

    # WebSocket message handlers
    async def interview_message(self, event):
        """Handle messages sent to the room group"""
        message = event['message']
        
        await self.send(text_data=json.dumps({
            'type': 'interview_message',
            'message': message
        }))
