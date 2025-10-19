import os
import tempfile
import base64
from django.conf import settings
from google.cloud import texttospeech
import requests
import json

class FreeTTSHandler:
    def __init__(self):
        self.google_tts_client = None
        self.fallback_to_browser = True
        
        # Initialize Google Cloud TTS if API key is available
        if hasattr(settings, 'GOOGLE_CLOUD_API_KEY') and settings.GOOGLE_CLOUD_API_KEY:
            try:
                self.google_tts_client = texttospeech.TextToSpeechClient()
                self.fallback_to_browser = False
            except Exception as e:
                print(f"Google Cloud TTS not available, using browser fallback: {e}")
                self.fallback_to_browser = True
    
    def generate_audio(self, text):
        """Generate audio using free Google Cloud TTS or browser fallback"""
        try:
            if not self.fallback_to_browser and self.google_tts_client:
                return self.generate_google_cloud_audio(text)
            else:
                return self.generate_browser_audio(text)
        except Exception as e:
            print(f"Error generating audio: {e}")
            return self.generate_browser_audio(text)
    
    def generate_google_cloud_audio(self, text):
        """Generate audio using Google Cloud TTS (free tier)"""
        try:
            # Check if we're within free tier limits
            if not self.check_free_tier_limits(text):
                return self.generate_browser_audio(text)
            
            synthesis_input = texttospeech.SynthesisInput(text=text)
            
            # Use a high-quality neural voice
            voice = texttospeech.VoiceSelectionParams(
                language_code="en-US",
                name="en-US-Neural2-F",  # High-quality neural voice
                ssml_gender=texttospeech.SsmlVoiceGender.FEMALE
            )
            
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=0.9,  # Slightly slower for clarity
                pitch=0.0
            )
            
            response = self.google_tts_client.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )
            
            return response.audio_content
            
        except Exception as e:
            print(f"Google Cloud TTS error: {e}")
            return self.generate_browser_audio(text)
    
    def generate_browser_audio(self, text):
        """Generate audio using browser's built-in speech synthesis"""
        try:
            # Return instructions for browser to use Web Speech Synthesis
            return {
                'type': 'browser_synthesis',
                'text': text,
                'voice': 'en-US',
                'rate': 0.9,
                'pitch': 1.0
            }
        except Exception as e:
            print(f"Browser synthesis error: {e}")
            return None
    
    def check_free_tier_limits(self, text):
        """Check if we're within Google Cloud free tier limits"""
        # This would track usage in your database
        # For now, assume we're within limits
        return True
    
    def get_audio_format(self, audio_content):
        """Get the appropriate audio format for the response"""
        if isinstance(audio_content, dict):
            return audio_content
        else:
            return {
                'type': 'audio_data',
                'data': base64.b64encode(audio_content).decode('utf-8'),
                'format': 'mp3'
            }
