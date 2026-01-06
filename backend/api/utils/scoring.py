"""
Scoring and Rating Utilities
=============================
Functions for calculating scores, converting to ratings, and normalizing feedback data.
"""

from typing import Dict, Any


def score_to_rating(score: int) -> str:
    """Convert numeric score to rating string"""
    if score >= 90:
        return 'Excellent'
    elif score >= 80:
        return 'Good'
    elif score >= 70:
        return 'Average'
    return 'Below Average'


def calculate_overall_score(behavioral_score: float, dsa_score: float = 0) -> int:
    """Calculate weighted overall score (70% behavioral, 30% DSA)"""
    if dsa_score > 0:
        return int((behavioral_score * 0.7) + (dsa_score * 0.3))
    return int(behavioral_score)


def normalize_scores(feedback_data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize scores to be within 0-10 range"""
    score_fields = ['overall_score', 'technical_proficiency', 'communication_skills', 'problem_solving']
    for score_field in score_fields:
        if score_field in feedback_data:
            if isinstance(feedback_data[score_field], dict):
                if 'score' in feedback_data[score_field]:
                    feedback_data[score_field]['score'] = max(0, min(10, feedback_data[score_field]['score']))
            else:
                feedback_data[score_field] = max(0, min(10, feedback_data[score_field]))
    return feedback_data


def determine_overall_recommendation(behavioral_report: Dict[str, Any], dsa_report: Dict[str, Any]) -> str:
    """Determine overall hire recommendation based on both reports"""
    # Get behavioral recommendation
    behavioral_rec = behavioral_report.get('recommendation', 'No Hire')
    behavioral_score = behavioral_report.get('overall_score', 0)
    
    # Get DSA recommendation
    dsa_rec = dsa_report.get('hire_recommendation', 'no')
    
    # Convert DSA recommendation to match behavioral format
    dsa_rec_normalized = 'Hire' if dsa_rec == 'yes' else ('Maybe' if dsa_rec == 'maybe' else 'No Hire')
    
    # Combine recommendations
    if behavioral_rec == 'Hire' and dsa_rec_normalized == 'Hire':
        return 'Strong Hire'
    elif behavioral_rec == 'Hire' or dsa_rec_normalized == 'Hire':
        if behavioral_rec == 'No Hire' or dsa_rec_normalized == 'No Hire':
            return 'Maybe'
        return 'Hire'
    elif behavioral_rec == 'Maybe' and dsa_rec_normalized == 'Maybe':
        return 'Maybe'
    elif behavioral_rec == 'Maybe' or dsa_rec_normalized == 'Maybe':
        return 'Maybe'
    else:
        return 'No Hire'

