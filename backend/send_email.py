"""
Professional Email Automation with Gemini AI
============================================
Automatically drafts and sends personalized recruitment emails using:
- Google Gemini AI for intelligent content generation
- Gmail SMTP for secure email delivery
- Environment variables for sensitive credentials

Author: Refined by GitHub Copilot
Date: October 2025
"""

import os
import sys
import json
import smtplib
import ssl
import logging
import argparse
import csv
from typing import Dict, Optional, Tuple
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dataclasses import dataclass
from dotenv import load_dotenv
from google import genai
from google.genai import types


# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class CandidateProfile:
    """Represents a candidate's profile information."""
    name: str
    email: str
    profile_data: str
    
    def validate(self) -> Tuple[bool, Optional[str]]:
        """Validate candidate data."""
        if not self.name or not self.name.strip():
            return False, "Candidate name cannot be empty"
        if not self.email or '@' not in self.email:
            return False, "Invalid email address"
        if not self.profile_data or not self.profile_data.strip():
            return False, "Profile data cannot be empty"
        return True, None


@dataclass
class EmailDraft:
    """Represents a drafted email."""
    subject: str
    body: str
    
    def validate(self) -> Tuple[bool, Optional[str]]:
        """Validate email draft."""
        if not self.subject or not self.subject.strip():
            return False, "Email subject cannot be empty"
        if not self.body or not self.body.strip():
            return False, "Email body cannot be empty"
        if len(self.subject) > 200:
            return False, "Email subject too long (max 200 chars)"
        return True, None


@dataclass
class EmailConfig:
    """Email configuration loaded from environment."""
    gemini_api_key: str
    sender_email: str
    sender_password: str
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 465
    
    @classmethod
    def from_env(cls) -> Optional['EmailConfig']:
        """Load configuration from environment variables."""
        gemini_key = os.getenv("GEMINI_API_KEY")
        sender_email = os.getenv("SENDER_EMAIL")
        sender_pass = os.getenv("SENDER_PASS")
        
        if not gemini_key:
            logger.error("❌ GEMINI_API_KEY not found in environment")
            return None
        if not sender_email:
            logger.error("❌ SENDER_EMAIL not found in environment")
            return None
        if not sender_pass:
            logger.error("❌ SENDER_PASS not found in environment")
            return None
            
        return cls(
            gemini_api_key=gemini_key,
            sender_email=sender_email,
            sender_password=sender_pass
        )


# ============================================================================
# CORE FUNCTIONS
# ============================================================================

def draft_email_with_gemini(
    candidate: CandidateProfile,
    recruiter_name: str,
    config: EmailConfig,
    meeting_link: Optional[str] = None,
    role: Optional[str] = None,
) -> Optional[EmailDraft]:
    """
    Uses Gemini AI to draft a personalized recruitment email.
    
    Args:
        candidate: The candidate's profile information
        recruiter_name: Name of the recruiter for personalization
        config: Email configuration with API credentials
        
    Returns:
        EmailDraft object if successful, None otherwise
    """
    logger.info(f"🤖 Drafting personalized email for {candidate.name}...")
    
    # Validate candidate data
    is_valid, error_msg = candidate.validate()
    if not is_valid:
        logger.error(f"❌ Invalid candidate data: {error_msg}")
        return None
    
    try:
        # Initialize Gemini Client
        client = genai.Client(api_key=config.gemini_api_key)
        
        # Define the JSON schema for structured output
        email_schema = types.Schema(
            type=types.Type.OBJECT,
            properties={
                "subject": types.Schema(
                    type=types.Type.STRING,
                    description="A concise, personalized subject line for a job opportunity (max 100 chars)."
                ),
                "body": types.Schema(
                    type=types.Type.STRING,
                    description="Professional email body with greeting, skills acknowledgment, purpose, and call-to-action with meeting link."
                )
            },
            required=["subject", "body"]
        )
        
        # Craft the AI prompt
        # Always use /ritiz for the meeting link unless overridden
        link = meeting_link or "https://calendly.com/ritiz"
        forced_opening = (
            f"I saw your mock interview using our AI in {role} role. We think you are the best candidate that we want."
            if role else ""
        )

        # Enforce greeting as 'Hy {candidate.name}'
        forced_greeting = f"Hy {candidate.name},"

        prompt = f"""
        You are a professional technical recruiter named '{recruiter_name}'.
    
        Write a personalized, warm, and professional email to invite a candidate for a follow-up interview.
    
        Candidate Information:
        - Name: {candidate.name}
        - Profile: {candidate.profile_data}
    
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
        
        # Generate content with Gemini
        logger.info("📡 Calling Gemini API...")
        response = client.models.generate_content(
            model='gemini-2.0-flash-exp',  # Using latest stable model
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=email_schema,
                temperature=0.7,  # Balanced creativity
            )
        )
        
        # Parse the JSON response
        draft_data = json.loads(response.text)
        body_text = draft_data['body']
        # Enforce greeting and opening line even if model deviates
        # Remove any leading greeting and replace with forced_greeting
        lines = body_text.strip().splitlines()
        # Find first non-empty line
        first_line_idx = 0
        while first_line_idx < len(lines) and not lines[first_line_idx].strip():
            first_line_idx += 1
        # Replace greeting
        if first_line_idx < len(lines):
            lines[first_line_idx] = forced_greeting
        # Enforce opening line after greeting if needed
        if forced_opening:
            # Find next non-empty line after greeting
            next_line_idx = first_line_idx + 1
            while next_line_idx < len(lines) and not lines[next_line_idx].strip():
                next_line_idx += 1
            if next_line_idx < len(lines):
                # Replace or insert forced opening line
                if not lines[next_line_idx].strip().lower().startswith(forced_opening.lower()):
                    lines.insert(next_line_idx, forced_opening)
            else:
                lines.append(forced_opening)
        body_text = "\n".join(lines)

        draft = EmailDraft(
            subject=draft_data['subject'],
            body=body_text
        )
        
        # Validate the draft
        is_valid, error_msg = draft.validate()
        if not is_valid:
            logger.error(f"❌ Invalid email draft: {error_msg}")
            return None
        
        logger.info(f"✅ Email drafted successfully")
        logger.info(f"📋 Subject: {draft.subject}")
        
        return draft
        
    except json.JSONDecodeError as e:
        logger.error(f"❌ Failed to parse Gemini response as JSON: {e}")
        logger.debug(f"Raw response: {response.text if 'response' in locals() else 'N/A'}")
        return None
    except Exception as e:
        logger.error(f"❌ Error during email drafting: {type(e).__name__}: {e}")
        return None


def send_smtp_email(
    recipient: CandidateProfile,
    draft: EmailDraft,
    config: EmailConfig
) -> Tuple[bool, str]:
    """
    Sends an email via Gmail SMTP with SSL encryption.
    
    Args:
        recipient: Candidate profile containing recipient email
        draft: The email draft to send
        config: Email configuration with SMTP credentials
        
    Returns:
        Tuple of (success: bool, message: str)
    """
    logger.info(f"📧 Sending email to {recipient.email}...")
    
    try:
        # Create a multipart message for better compatibility
        msg = MIMEMultipart('alternative')
        msg['Subject'] = draft.subject
        msg['From'] = f"{config.sender_email}"
        msg['To'] = recipient.email
        
        # Attach the body as plain text
        msg.attach(MIMEText(draft.body, 'plain', 'utf-8'))
        
        # Establish secure SSL connection
        context = ssl.create_default_context()
        
        with smtplib.SMTP_SSL(
            config.smtp_server, 
            config.smtp_port, 
            context=context,
            timeout=30
        ) as server:
            # Login with App Password (not regular Gmail password)
            logger.info("🔐 Authenticating with SMTP server...")
            server.login(config.sender_email, config.sender_password)
            
            # Send the email
            logger.info("📨 Transmitting email...")
            server.sendmail(
                config.sender_email,
                [recipient.email],
                msg.as_string()
            )
        
        success_msg = f"✅ Email sent successfully to {recipient.email}"
        logger.info(success_msg)
        return True, success_msg
        
    except smtplib.SMTPAuthenticationError:
        error_msg = "❌ SMTP Authentication failed. Check your SENDER_EMAIL and SENDER_PASS (use Gmail App Password, not regular password)"
        logger.error(error_msg)
        return False, error_msg
    except smtplib.SMTPException as e:
        error_msg = f"❌ SMTP error occurred: {e}"
        logger.error(error_msg)
        return False, error_msg
    except Exception as e:
        error_msg = f"❌ Unexpected error sending email: {type(e).__name__}: {e}"
        logger.error(error_msg)
        return False, error_msg


def automate_recruitment_email(
    candidate: CandidateProfile,
    recruiter_name: str,
    config: EmailConfig,
    dry_run: bool = False,
    meeting_link: Optional[str] = None,
    role: Optional[str] = None,
) -> bool:
    """
    Complete automation workflow: draft and send personalized recruitment email.
    
    Args:
        candidate: Candidate profile information
        recruiter_name: Recruiter's name for personalization
        config: Email configuration
        dry_run: If True, only draft but don't send the email
        
    Returns:
        True if successful, False otherwise
    """
    logger.info("=" * 70)
    logger.info(f"🚀 STARTING RECRUITMENT EMAIL AUTOMATION")
    logger.info(f"📋 Candidate: {candidate.name}")
    logger.info(f"👤 Recruiter: {recruiter_name}")
    logger.info(f"🔧 Mode: {'DRY RUN (no email sent)' if dry_run else 'LIVE (will send email)'}")
    logger.info("=" * 70)
    
    # Step 1: Draft the email
    draft = draft_email_with_gemini(
        candidate, recruiter_name, config,
        meeting_link=meeting_link, role=role
    )
    
    if not draft:
        logger.error("❌ Automation halted: Email drafting failed")
        return False
    
    # Display the draft
    logger.info("\n" + "─" * 70)
    logger.info("📝 DRAFTED EMAIL PREVIEW")
    logger.info("─" * 70)
    logger.info(f"To: {candidate.email}")
    logger.info(f"Subject: {draft.subject}")
    logger.info("─" * 70)
    logger.info(draft.body)
    logger.info("─" * 70 + "\n")
    
    # Step 2: Send the email (unless dry run)
    if dry_run:
        logger.info("🔵 DRY RUN: Email drafted but not sent")
        return True
    
    success, message = send_smtp_email(candidate, draft, config)
    
    logger.info("=" * 70)
    logger.info(f"📊 FINAL STATUS: {'SUCCESS ✅' if success else 'FAILURE ❌'}")
    logger.info(f"💬 Message: {message}")
    logger.info("=" * 70)
    
    return success


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Draft and send recruitment emails (Gemini + Gmail)")
    parser.add_argument("--name", help="Candidate name")
    parser.add_argument("--email", help="Candidate email")
    parser.add_argument("--profile", help="Candidate profile summary")
    parser.add_argument("--role", help="Role to mention in the opening sentence")
    parser.add_argument("--meeting-link", dest="meeting_link", help="Override meeting link (e.g., https://calendly.com/yourname/30min)")
    parser.add_argument("--dry-run", action="store_true", help="Draft only; do not send")
    parser.add_argument("--csv", help="CSV file with columns: name,email,profile_data")
    return parser.parse_args()


def main():
    """Main entry point for the email automation script."""
    
    # Load environment variables from .env file
    load_dotenv()
    logger.info("🔧 Loading environment variables...")
    
    # Load configuration
    config = EmailConfig.from_env()
    if not config:
        logger.error("❌ Configuration failed. Please check your .env file")
        logger.info("💡 Required variables: GEMINI_API_KEY, SENDER_EMAIL, SENDER_PASS")
        sys.exit(1)
    
    args = _parse_args()

    # Recruiter fixed to you; allow override via env if needed
    recruiter_name = os.getenv("RECRUITER_NAME", "Ritiz")

    # Batch mode via CSV
    if args.csv:
        sent_all = True
        try:
            with open(args.csv, newline='', encoding="utf-8") as f:
                reader = csv.DictReader(f)
                required = {"name", "email", "profile_data"}
                if not required.issubset({(h or '').strip() for h in (reader.fieldnames or [])}):
                    logger.error("❌ CSV must have headers: name,email,profile_data")
                    sys.exit(1)
                for row in reader:
                    candidate = CandidateProfile(
                        name=(row.get("name") or '').strip(),
                        email=(row.get("email") or '').strip(),
                        profile_data=(row.get("profile_data") or '').strip(),
                    )
                    ok = automate_recruitment_email(
                        candidate=candidate,
                        recruiter_name=recruiter_name,
                        config=config,
                        dry_run=args.dry_run,
                        meeting_link=args.meeting_link,
                        role=args.role,
                    )
                    sent_all = sent_all and ok
        except FileNotFoundError:
            logger.error(f"❌ CSV file not found: {args.csv}")
            sys.exit(1)
        sys.exit(0 if sent_all else 1)

    # Single-candidate mode (CLI args or interactive prompts)
    name = args.name or input("Candidate name: ").strip()
    email = args.email or input("Candidate email: ").strip()
    profile = args.profile or input("Candidate profile summary: ").strip()

    candidate = CandidateProfile(name=name, email=email, profile_data=profile)

    success = automate_recruitment_email(
        candidate=candidate,
        recruiter_name=recruiter_name,
        config=config,
        dry_run=args.dry_run,
        meeting_link=args.meeting_link,
        role=args.role,
    )
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
