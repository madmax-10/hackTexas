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
from django.conf import settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending recruitment emails using Gemini AI and Gmail SMTP."""
    
    def __init__(self):
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        self.sender_email = os.getenv('SENDER_EMAIL')
        self.sender_password = os.getenv('SENDER_PASS')
        self.recruiter_name = os.getenv('RECRUITER_NAME', 'Ritiz')
        self.meeting_link = os.getenv('MEETING_LINK', 'https://calendly.com/ritiz')
        
        # Gemini client will be created per request in draft function
    
    def is_configured(self) -> bool:
        """Check if email service is properly configured."""
        return all([
            self.gemini_api_key,
            self.sender_email,
            self.sender_password
        ])
    
    def draft_email_with_gemini(
        self, 
        candidate_name: str, 
        candidate_email: str, 
        position: str,
        report_data: dict
    ) -> Optional[dict]:
        """
        Use Gemini AI to draft a personalized recruitment email (mirrors send_email.py).
        Returns a dict with 'subject' and 'body' or None on failure.
        """
        if not self.gemini_api_key:
            logger.error("❌ Gemini API key not configured")
            return None

        try:
            # Build candidate profile text from report data
            strengths = report_data.get('strengths') or []
            assessment = report_data.get('overall_assessment') or ''
            profile_data = (
                f"Role: {position}\n"
                f"Assessment: {assessment}\n"
                f"Strengths: {', '.join(strengths[:3]) if strengths else 'Strong fundamentals'}"
            )

            # Define the JSON schema for structured output
            email_schema = types.Schema(
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

            # Required greeting and opening
            forced_greeting = f"Hy {candidate_name},"
            forced_opening = (
                f"I saw your mock interview using our AI in {position} role. We think you are the best candidate that we want."
                if position else ""
            )

            # Craft the prompt
            link = self.meeting_link or "https://calendly.com/ritiz"
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
            4. Include the meeting scheduling link: {link}
            5. Keep the subject line under 100 characters
            6. Keep the email concise (3-4 short paragraphs)
            7. Use proper email formatting with greeting and sign-off
            8. The greeting must be exactly: {forced_greeting} (do not use any other greeting)
            {('9. Start the email body with this exact first sentence (do not change it): ' + forced_opening) if forced_opening else ''}

            Output Format:
            Return ONLY a valid JSON object matching the schema (no markdown, no extra text).
            """

            # Generate content with Gemini using the new client API
            logger.info("📡 Calling Gemini API...")
            client = genai.Client(api_key=self.gemini_api_key)
            response = client.models.generate_content(
                model='gemini-2.0-flash-exp',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=email_schema,
                    temperature=0.7,
                ),
            )

            # Parse JSON and enforce greeting/opening
            draft_data = json.loads(response.text)
            body_text = draft_data.get('body', '').strip()
            lines = body_text.splitlines()
            i = 0
            while i < len(lines) and not lines[i].strip():
                i += 1
            if i < len(lines):
                lines[i] = forced_greeting
            else:
                lines = [forced_greeting]
            if forced_opening:
                j = i + 1
                while j < len(lines) and not lines[j].strip():
                    j += 1
                if j < len(lines):
                    if not lines[j].strip().lower().startswith(forced_opening.lower()):
                        lines.insert(j, forced_opening)
                else:
                    lines.append(forced_opening)
            body_text = "\n".join(lines)

            subject_text = draft_data.get('subject', '').strip() or f"Exciting Opportunity - {position} Role"
            return {
                'subject': subject_text,
                'body': body_text,
            }

        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse Gemini response as JSON: {e}")
            logger.debug(f"Raw response: {response.text if 'response' in locals() else 'N/A'}")
            return None
        except Exception as e:
            logger.error(f"❌ Error drafting email with Gemini: {type(e).__name__}: {e}")
            return None
    
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
        
        # Draft the email
        draft = self.draft_email_with_gemini(candidate_name, candidate_email, position, report_data)
        if not draft:
            return False, "Failed to draft email"
        
        try:
            # Create email message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = draft['subject']
            msg['From'] = self.sender_email
            msg['To'] = candidate_email
            
            # Attach the body
            msg.attach(MIMEText(draft['body'], 'plain', 'utf-8'))
            
            # Send via Gmail SMTP (use certifi CA bundle to avoid macOS cert issues)
            context = ssl.create_default_context(cafile=certifi.where())
            
            with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=context, timeout=30) as server:
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, [candidate_email], msg.as_string())
            
            logger.info(f"✅ Email sent successfully to {candidate_email}")
            return True, f"Email sent successfully to {candidate_email}"
            
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
