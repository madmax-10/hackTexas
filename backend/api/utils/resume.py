"""
Resume Processing Utilities
============================
Functions for extracting text from PDF and image resumes.
"""

import re
import logging
import fitz  # PyMuPDF
import google.generativeai as genai
from django.conf import settings
from typing import Optional, Dict

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)

logger = logging.getLogger(__name__)


class ResumeParser:
    """Parser for extracting and cleaning text from PDF resumes using PyMuPDF"""
    
    def extract(self, file_path: str = None, file_bytes: bytes = None) -> Dict:
        """
        Extract text from PDF file.
        Can accept either a file path or file bytes.
        Returns a dict with 'text' and 'pages'.
        """
        
        if not file_path and not file_bytes:
            return {"error": "Either file_path or file_bytes must be provided", "text": "", "pages": 0}
        
        try:
            # Open from bytes (memory) or file path
            if file_bytes:
                doc = fitz.open(stream=file_bytes, filetype="pdf")
            else:
                doc = fitz.open(file_path)
            
            raw_text_chunks = []

            # Extract text from all pages
            for page in doc:
                # get_text("text") usually preserves reading order for columns
                raw_text_chunks.append(page.get_text("text"))
            
            full_raw_text = "\n".join(raw_text_chunks)
            
            # Get page count before closing
            page_count = len(doc)
            
            # Clean text
            clean_text = self._sanitize_text(full_raw_text)
            
            doc.close()
            
            return {
                "text": clean_text,
                "pages": page_count,
            }

        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            return {"error": str(e), "text": "", "pages": 0}

    def _sanitize_text(self, text: str) -> str:
        """
        Aggressive regex cleaning to normalize spacing and remove artifacts.
        """
        # 1. Replace non-breaking spaces and weird unicode spaces with standard space
        text = text.replace('\xa0', ' ')
        
        # 2. Remove non-printable characters (keep newlines/tabs)
        text = re.sub(r'[^\x00-\x7F\n\t]+', ' ', text)
        
        # 3. Fix multiple newlines (preserve paragraph breaks, kill massive gaps)
        # Matches 3 or more newlines and replaces with 2
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # 4. Collapse multiple spaces into one (excluding newlines)
        text = re.sub(r'[ \t]+', ' ', text)
        
        # 5. Clean up bullet points (normalize specific chars to "•")
        text = re.sub(r'^\s*[\•\-\*]\s+', '• ', text, flags=re.MULTILINE)

        return text.strip()


# Global parser instance
_parser = ResumeParser()


def extract_text_from_pdf(pdf_path: str = None, file_bytes: bytes = None) -> str:
    """
    Extract text from PDF resume using PyMuPDF.
    Can accept either a file path or file bytes.
    Returns cleaned text string for backward compatibility.
    """
    try:
        result = _parser.extract(file_path=pdf_path, file_bytes=file_bytes)
        if "error" in result:
            logger.error(f"PDF extraction failed: {result['error']}")
            return "Resume content could not be extracted"
        
        text = result.get("text", "")
        if not text.strip():
            logger.warning("Extracted text is empty, attempting fallback")
            return "Resume content could not be extracted"
        
        logger.info(f"Extracted {result.get('pages', 0)} pages from PDF")
        return text
        
    except Exception as e:
        logger.error(f"Error in extract_text_from_pdf: {e}")
        return "Resume content could not be extracted"