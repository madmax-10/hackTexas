"""
Feedback Generation Utilities
=============================
Functions for generating interview feedback and handling fallback scenarios.
"""

import json
import logging
import google.generativeai as genai
from django.conf import settings
from typing import Dict, Any

from .scoring import normalize_scores

logger = logging.getLogger(__name__)


def clean_json_text(text: str) -> str:
    """Clean JSON text by removing markdown code blocks"""
    if text.startswith("```json"):
        return text.replace("```json", "").replace("```", "").strip()
    elif text.startswith("```"):
        return text.replace("```", "").strip()
    return text.strip()


def generate_enhanced_final_feedback(service, session) -> Dict[str, Any]:
    """Generate comprehensive final feedback with improved system prompts and JSON formatting"""
    try:
        # Create a detailed transcript with all interview data
        transcript_parts = []
        for i, item in enumerate(service.chat_history):
            question_info = f"Question {i+1} ({item.get('type', 'General')}, {item.get('difficulty', 'Medium')}):"
            question_text = item.get('question', 'N/A')
            answer_text = item.get('answer', 'N/A')
            evaluation = item.get('evaluation', {})
            score = evaluation.get('score', 'N/A') if evaluation else 'N/A'
            feedback = evaluation.get('feedback', 'N/A') if evaluation else 'N/A'
            
            transcript_parts.append(f"""
{question_info}
{question_text}

Answer:
{answer_text}

Score: {score}
Feedback: {feedback}
---""")
        
        transcript = "\n".join(transcript_parts)
        
        # Enhanced system prompt for better JSON formatting
        system_prompt = """You are an expert senior hiring manager and technical interviewer with 15+ years of experience. 
You specialize in conducting comprehensive candidate evaluations and providing detailed, actionable feedback.

Your task is to analyze the complete interview transcript and provide a thorough, professional assessment in a specific JSON format.

IMPORTANT: You MUST respond ONLY with valid JSON. Do not include any text before or after the JSON. 
The JSON must be properly formatted and complete.

Guidelines for scoring:
- Overall Score: 0-10 (0-3: Poor, 4-6: Fair, 7-8: Good, 9-10: Excellent)
- Individual scores: 0-10 for each category
- Be specific and constructive in all feedback
- Focus on actionable insights
- Consider the role requirements and resume background
- Provide balanced assessment highlighting both strengths and areas for improvement"""

        # Enhanced human prompt with better structure
        human_prompt = f"""Based on the complete interview below, provide a comprehensive performance analysis.

CANDIDATE INFORMATION:
Role: {service.role}
Resume Background: {service.resume_text[:500]}...

COMPLETE INTERVIEW TRANSCRIPT:
{transcript}

Please analyze this interview and provide your assessment in the following EXACT JSON format:

{{
  "overall_score": 8,
  "overall_assessment": "The candidate demonstrates strong technical knowledge and clear communication skills. They show good problem-solving abilities and provide detailed, structured answers. However, there are some areas where they could be more specific with examples.",
  "strengths": [
    "Strong technical foundation in relevant areas",
    "Clear and structured communication style",
    "Good problem-solving approach",
    "Demonstrates relevant experience"
  ],
  "areas_for_improvement": [
    "Could provide more specific examples from past projects",
    "Should elaborate more on technical implementation details",
    "Could demonstrate more leadership experience"
  ],
  "technical_proficiency": {{
    "score": 8,
    "comment": "Shows solid understanding of core concepts and can explain technical topics clearly. Demonstrates good knowledge of relevant technologies and frameworks."
  }},
  "communication_skills": {{
    "score": 7,
    "comment": "Communicates ideas clearly and structures responses well. Could improve by providing more specific examples and being more concise in some areas."
  }},
  "problem_solving": {{
    "score": 8,
    "comment": "Shows good analytical thinking and approaches problems systematically. Demonstrates ability to break down complex problems into manageable parts."
  }},
  "key_focus_areas": [
    "Technical depth and specific examples",
    "Leadership and team collaboration",
    "Project management experience"
  ],
  "recommendation": "Hire"
}}

Remember: Respond ONLY with the JSON object above, no additional text."""

        # Use Gemini directly for better control
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Create the full prompt
        full_prompt = f"{system_prompt}\n\n{human_prompt}"
        
        # Generate response
        response = model.generate_content(full_prompt)
        
        feedback_text = clean_json_text(response.text)
        
        try:
            feedback_data = json.loads(feedback_text)
            required_fields = [
                'overall_score', 'overall_assessment', 'strengths', 
                'areas_for_improvement', 'technical_proficiency', 
                'communication_skills', 'problem_solving', 'key_focus_areas', 'recommendation'
            ]
            
            for field in required_fields:
                if field not in feedback_data:
                    raise ValueError(f"Missing required field: {field}")
            
            return normalize_scores(feedback_data)
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}\nRaw response: {feedback_text}")
            return create_fallback_feedback(service)
            
    except Exception as e:
        logger.error(f"Error in generate_enhanced_final_feedback: {e}")
        return create_fallback_feedback(service)


def create_fallback_feedback(service) -> Dict[str, Any]:
    """Create a fallback feedback structure if AI generation fails"""
    try:
        # Calculate basic scores from chat history
        total_questions = len(service.chat_history)
        if total_questions == 0:
            return {
                "overall_score": 0,
                "overall_assessment": "No interview data available for analysis.",
                "strengths": [],
                "areas_for_improvement": ["Complete the interview to receive feedback"],
                "technical_proficiency": {"score": 0, "comment": "No data available"},
                "communication_skills": {"score": 0, "comment": "No data available"},
                "problem_solving": {"score": 0, "comment": "No data available"},
                "key_focus_areas": ["Complete the interview process"],
                "recommendation": "No Hire"
            }
        
        # Calculate average scores from evaluations
        scores = []
        for item in service.chat_history:
            evaluation = item.get('evaluation', {})
            if evaluation and 'score' in evaluation:
                scores.append(evaluation['score'])
        
        avg_score = sum(scores) / len(scores) if scores else 5
        
        return {
            "overall_score": round(avg_score, 1),
            "overall_assessment": f"Based on {total_questions} questions, the candidate shows potential but needs further evaluation.",
            "strengths": ["Participated in the interview process"],
            "areas_for_improvement": ["Provide more detailed answers", "Give specific examples"],
            "technical_proficiency": {"score": round(avg_score, 1), "comment": "Basic technical understanding demonstrated"},
            "communication_skills": {"score": round(avg_score, 1), "comment": "Clear communication with room for improvement"},
            "problem_solving": {"score": round(avg_score, 1), "comment": "Shows problem-solving approach"},
            "key_focus_areas": ["Technical depth", "Specific examples", "Leadership experience"],
            "recommendation": "Maybe" if avg_score >= 6 else "No Hire"
        }
        
    except Exception as e:
        logger.error(f"Error creating fallback feedback: {e}")
        return {
            "overall_score": 0,
            "overall_assessment": "Unable to generate feedback due to technical issues.",
            "strengths": [],
            "areas_for_improvement": ["Technical system error occurred"],
            "technical_proficiency": {"score": 0, "comment": "System error"},
            "communication_skills": {"score": 0, "comment": "System error"},
            "problem_solving": {"score": 0, "comment": "System error"},
            "key_focus_areas": [],
            "recommendation": "No Hire"
        }

