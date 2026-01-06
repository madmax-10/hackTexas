"""
Audio Generation Utilities
==========================
Functions for text-to-speech conversion using Eleven Labs API.
"""

import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def generate_elevenlabs_audio(text: str) -> bytes:
    """Generate audio using Eleven Labs API"""
    try:
        if not settings.ELEVEN_LABS_API_KEY or not settings.ELEVEN_LABS_VOICE_ID:
            logger.error("Eleven Labs API key or voice ID not configured")
            return None
            
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVEN_LABS_VOICE_ID}"
        
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": settings.ELEVEN_LABS_API_KEY
        }
        
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        
        response = requests.post(url, json=data, headers=headers)
        
        if response.status_code == 200:
            return response.content
        else:
            logger.error(f"Eleven Labs API error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error generating Eleven Labs audio: {e}")
        return None

