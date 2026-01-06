"""
Email Service for Interview Reports
===================================
Handles sending emails when recruiters accept candidates.
"""

import os
import json
import smtplib
import ssl
import certifi
import logging
from typing import Optional, Tuple
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# ==================== Constants ====================
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 465
SMTP_TIMEOUT = 30
DEFAULT_RECRUITER_NAME = 'Ritiz'
DEFAULT_MEETING_LINK = 'https://calendly.com/ritiz'
GEMINI_MODEL = 'gemini-2.0-flash-exp'
GEMINI_TEMPERATURE = 0.7
DEFAULT_STRENGTHS_FALLBACK = 'Strong fundamentals'
SUBJECT_FALLBACK_TEMPLATE = "Exciting Opportunity - {position} Role"

class EmailService:
    """Service for sending recruitment emails using Gemini AI and Gmail SMTP."""
    
    def __init__(self):
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        self.sender_email = os.getenv('SENDER_EMAIL')
        self.sender_password = os.getenv('SENDER_PASS')
        self.recruiter_name = os.getenv('RECRUITER_NAME', DEFAULT_RECRUITER_NAME)
        self.meeting_link = os.getenv('MEETING_LINK', DEFAULT_MEETING_LINK)
    
    def is_configured(self) -> bool:
        """Check if email service is properly configured."""
        return all([
            self.gemini_api_key,
            self.sender_email,
            self.sender_password
        ])
    
    def _build_profile_data(self, position: str, report_data: dict) -> str:
        """Build candidate profile text from report data."""
        strengths = report_data.get('strengths') or []
        assessment = report_data.get('overall_assessment') or ''
        strengths_text = ', '.join(strengths[:3]) if strengths else DEFAULT_STRENGTHS_FALLBACK
        return f"Role: {position}\nAssessment: {assessment}\nStrengths: {strengths_text}"
    
    def _get_email_schema(self) -> types.Schema:
        """Get the JSON schema for email generation."""
        return types.Schema(
            type=types.Type.OBJECT,
            properties={
                "subject": types.Schema(
                    type=types.Type.STRING,
                    description="A concise, personalized subject line for a job opportunity (max 100 chars).",
                ),
                "body": types.Schema(
                    type=types.Type.STRING,
                    description="Professional email body with greeting, skills acknowledgment, purpose, and call-to-action with meeting link.",
                ),
            },
            required=["subject", "body"],
        )
    
    def _enforce_greeting_and_opening(self, body_text: str, greeting: str, opening: str) -> str:
        """Enforce specific greeting and opening in email body."""
        lines = body_text.splitlines()
        
        # Find first non-empty line and replace with greeting
        i = 0
        while i < len(lines) and not lines[i].strip():
            i += 1
        
        if i < len(lines):
            lines[i] = greeting
        else:
            lines = [greeting]
        
        # Insert opening if provided
        if opening:
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            
            if j < len(lines):
                if not lines[j].strip().lower().startswith(opening.lower()):
                    lines.insert(j, opening)
            else:
                lines.append(opening)
        
        return "\n".join(lines)
    
    def draft_email_with_gemini(
        self, 
        candidate_name: str, 
        candidate_email: str, 
        position: str,
        report_data: dict
    ) -> Optional[dict]:
        """
        Use Gemini AI to draft a personalized recruitment email.
        Returns a dict with 'subject' and 'body' or None on failure.
        """
        if not self.gemini_api_key:
            logger.error("❌ Gemini API key not configured")
            return None

        try:
            profile_data = self._build_profile_data(position, report_data)
            email_schema = self._get_email_schema()
            
            forced_greeting = f"Hy {candidate_name},"
            forced_opening = (
                f"I saw your mock interview using our AI in {position} role. We think you are the best candidate that we want."
                if position else ""
            )

            prompt = f"""
            You are a professional technical recruiter named '{self.recruiter_name}'.

            Write a personalized, warm, and professional email to invite a candidate for a follow-up interview.

            Candidate Information:
            - Name: {candidate_name}
            - Profile: {profile_data}

            Requirements:
            1. Use a friendly yet professional tone
            2. Acknowledge their specific skills and experience mentioned in the profile
            3. Clearly state this is for an exciting opportunity/role discussion
            4. Include the meeting scheduling link: {self.meeting_link}
            5. Keep the subject line under 100 characters
            6. Keep the email concise (3-4 short paragraphs)
            7. Use proper email formatting with greeting and sign-off
            8. The greeting must be exactly: {forced_greeting} (do not use any other greeting)
            {('9. Start the email body with this exact first sentence (do not change it): ' + forced_opening) if forced_opening else ''}

            Output Format:
            Return ONLY a valid JSON object matching the schema (no markdown, no extra text).
            """

            logger.info("📡 Calling Gemini API...")
            client = genai.Client(api_key=self.gemini_api_key)
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=email_schema,
                    temperature=GEMINI_TEMPERATURE,
                ),
            )

            draft_data = json.loads(response.text)
            body_text = self._enforce_greeting_and_opening(
                draft_data.get('body', '').strip(),
                forced_greeting,
                forced_opening
            )
            subject_text = draft_data.get('subject', '').strip() or SUBJECT_FALLBACK_TEMPLATE.format(position=position)
            
            return {'subject': subject_text, 'body': body_text}

        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse Gemini response as JSON: {e}")
            logger.debug(f"Raw response: {response.text if 'response' in locals() else 'N/A'}")
            return None
        except Exception as e:
            logger.error(f"❌ Error drafting email with Gemini: {type(e).__name__}: {e}")
            return None
    
    def _create_email_message(self, subject: str, body: str, to_email: str) -> MIMEMultipart:
        """Create an email message with subject, body, and recipient."""
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = self.sender_email
        msg['To'] = to_email
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        return msg
    
    def _send_via_smtp(self, message: MIMEMultipart, recipient: str) -> None:
        """Send email via Gmail SMTP."""
        context = ssl.create_default_context(cafile=certifi.where())
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context, timeout=SMTP_TIMEOUT) as server:
            server.login(self.sender_email, self.sender_password)
            server.sendmail(self.sender_email, [recipient], message.as_string())
    
    def send_email(
        self, 
        candidate_name: str, 
        candidate_email: str, 
        position: str,
        report_data: dict
    ) -> Tuple[bool, str]:
        """
        Send a recruitment email to the candidate.
        
        Args:
            candidate_name: Name of the candidate
            candidate_email: Email of the candidate
            position: Position they applied for
            report_data: Interview report data
            
        Returns:
            Tuple of (success: bool, message: str)
        """
        if not self.is_configured():
            return False, "Email service not configured. Missing environment variables."
        
        draft = self.draft_email_with_gemini(candidate_name, candidate_email, position, report_data)
        if not draft:
            return False, "Failed to draft email"
        
        try:
            msg = self._create_email_message(draft['subject'], draft['body'], candidate_email)
            self._send_via_smtp(msg, candidate_email)
            
            success_msg = f"Email sent successfully to {candidate_email}"
            logger.info(f"✅ {success_msg}")
            return True, success_msg
            
        except smtplib.SMTPAuthenticationError:
            error_msg = "SMTP Authentication failed. Check SENDER_EMAIL and SENDER_PASS"
            logger.error(error_msg)
            return False, error_msg
        except Exception as e:
            error_msg = f"Error sending email: {str(e)}"
            logger.error(error_msg)
            return False, error_msg

# Global email service instance
email_service = EmailService()
