import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { stopAllCameras } from '../utils/cameraUtils';

function ReportPage({ sessionData }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionData || !sessionData.report) {
      navigate('/');
    } else {
      // Stop camera when report page loads
      stopAllCameras();
    }
  }, [sessionData, navigate]);

  useEffect(() => {
    return () => {
      stopAllCameras();
    };
  }, []);

  if (!sessionData || !sessionData.report) {
    return null;
  }

  // Check if this is a combined report (behavioral + DSA) or just behavioral
  const reportData = sessionData.report;
  const isCombinedReport = reportData.behavioral_interview && reportData.dsa_interview;
  
  // Extract behavioral report data
  const behavioralReport = isCombinedReport ? reportData.behavioral_interview : reportData;
  const dsaReport = isCombinedReport ? reportData.dsa_interview : null;
  const overallRecommendation = isCombinedReport ? reportData.overall_recommendation : behavioralReport.recommendation;
  
  // Extract scores from behavioral report
  const overallScore = behavioralReport.overall_score || 0;
  const technicalScore = behavioralReport.technical_proficiency?.score || 0;
  const communicationScore = behavioralReport.communication_skills?.score || 0;
  const problemSolvingScore = behavioralReport.problem_solving?.score || 0;
  
  // Use overall score as primary, with fallback to average
  const scores = [technicalScore, communicationScore, problemSolvingScore].filter(s => s > 0);
  const avgScore = overallScore > 0 ? overallScore.toFixed(1) : 
    (scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0.0');

  const getScoreColor = (score) => {
    if (score >= 8) return '#10b981';
    if (score >= 6) return '#f59e0b';
    return '#ef4444';
  };

  const getScoreLabel = (score) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Needs Improvement';
  };

  const getRecommendationColor = (recommendation) => {
    switch (recommendation?.toLowerCase()) {
      case 'strong hire': return '#10b981';
      case 'hire': return '#22c55e';
      case 'maybe': return '#f59e0b';
      case 'no hire': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getRecommendationIcon = (recommendation) => {
    switch (recommendation?.toLowerCase()) {
      case 'strong hire': return '🎉';
      case 'hire': return '✅';
      case 'maybe': return '🤔';
      case 'no hire': return '❌';
      default: return '📊';
    }
  };

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1c1c1c 0%, #2a2a2a 100%)',
    fontFamily: 'Playfair Display, serif',
    color: '#e0d5c5',
    lineHeight: '1.6',
    transform: 'perspective(1000px)',
    boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)'
  };

  const cardStyle = {
    backgroundColor: '#2a2a2a',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4), 0 8px 20px rgba(0, 0, 0, 0.3)',
    border: '1px solid #4b3832',
    marginBottom: '24px',
    transform: 'perspective(1000px) translateZ(10px)',
    transition: 'all 0.3s ease'
  };

  const buttonStyle = {
    background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
    color: '#1c1c1c',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 8px 25px rgba(212, 175, 55, 0.4), 0 4px 15px rgba(212, 175, 55, 0.3)',
    transform: 'perspective(1000px) translateZ(0)',
    transition: 'all 0.3s ease'
  };

  const secondaryButtonStyle = {
    background: 'transparent',
    color: '#374151',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
    border: '2px solid #d1d5db',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  };

  return (
    <div style={containerStyle}>
      {/* Navigation */}
      <nav style={{
        background: 'rgba(30, 30, 30, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #4b3832',
        position: 'sticky',
        top: '0',
        zIndex: '50',
        padding: '16px 24px',
        transform: 'perspective(1000px) rotateX(0deg)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/?section=home')}
          >
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '18px'
            }}>
              M
            </div>
            <span style={{
              fontSize: '20px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Mock Me?!
            </span>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px'
          }}>
            <button 
              onClick={() => navigate('/?section=about')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e0d5c5',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#d4af37'}
              onMouseLeave={(e) => e.target.style.color = '#e0d5c5'}
            >
              About
            </button>
            <button 
              onClick={() => navigate('/?section=programs')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e0d5c5',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#d4af37'}
              onMouseLeave={(e) => e.target.style.color = '#e0d5c5'}
            >
              Jobs
            </button>
            <button 
              onClick={() => navigate('/?section=resources')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#e0d5c5',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = '#d4af37'}
              onMouseLeave={(e) => e.target.style.color = '#e0d5c5'}
            >
              Resources
            </button>
          </div>
        </div>
      </nav>

      {/* Header Section */}
      <section style={{
        padding: '60px 24px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
        color: 'white'
      }}>
        <div style={{maxWidth: '800px', margin: '0 auto'}}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '700',
            marginBottom: '16px',
            lineHeight: '1.2'
          }}>
            Assessment Report
          </h1>
          <h2 style={{
            fontSize: '1.5rem',
            marginBottom: '24px',
            opacity: '0.9'
          }}>
            Comprehensive Analysis of Your Performance
          </h2>
          <p style={{
            fontSize: '1.1rem',
            marginBottom: '24px',
            opacity: '0.9'
          }}>
            Role: <strong>{sessionData.demo?.title || sessionData.role}</strong>
          </p>
          {overallRecommendation && (
            <div style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '24px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 'bold',
              fontSize: '16px',
              backdropFilter: 'blur(10px)'
            }}>
              <span>{getRecommendationIcon(overallRecommendation)}</span>
              <span>Recommendation: {overallRecommendation}</span>
            </div>
          )}
        </div>
      </section>

      {/* Executive Summary Section */}
      <section style={{padding: '60px 24px', backgroundColor: 'white'}}>
        <div style={{maxWidth: '1200px', margin: '0 auto'}}>
          <div style={{...cardStyle, textAlign: 'center'}}>
            <h2 style={{
              color: '#1f2937',
              fontSize: '2rem',
              marginBottom: '40px',
              fontWeight: '700'
            }}>
              Performance Summary
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
              marginBottom: '32px'
            }}>
              <div style={{
                padding: '24px',
                border: '2px solid #e5e7eb',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#f8fafc'
              }}>
                <h3 style={{color: '#d4af37', fontSize: '1.2rem', marginBottom: '16px', fontWeight: '600'}}>Overall Score</h3>
                <div style={{
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '2rem', 
                  fontWeight: 'bold',
                  backgroundColor: getScoreColor(parseFloat(avgScore)),
                  color: 'white',
                  marginBottom: '12px'
                }}>
                  {avgScore}
                </div>
                <p style={{color: '#6b7280', fontSize: '14px', marginBottom: '8px'}}>out of 10</p>
                <p style={{color: '#d4af37', fontSize: '16px', fontWeight: 'bold'}}>{getScoreLabel(parseFloat(avgScore))}</p>
              </div>

              <div style={{
                padding: '24px',
                border: '2px solid #e5e7eb',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#f8fafc'
              }}>
                <h3 style={{color: '#d4af37', fontSize: '1.2rem', marginBottom: '16px', fontWeight: '600'}}>Communication</h3>
                <div style={{
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '2rem', 
                  fontWeight: 'bold',
                  backgroundColor: getScoreColor(communicationScore),
                  color: 'white',
                  marginBottom: '12px'
                }}>
                  {communicationScore}
                </div>
                <p style={{color: '#6b7280', fontSize: '14px', marginBottom: '8px'}}>out of 10</p>
                <p style={{color: '#d4af37', fontSize: '16px', fontWeight: 'bold'}}>{getScoreLabel(communicationScore)}</p>
              </div>

              <div style={{
                padding: '24px',
                border: '2px solid #e5e7eb',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#f8fafc'
              }}>
                <h3 style={{color: '#d4af37', fontSize: '1.2rem', marginBottom: '16px', fontWeight: '600'}}>Technical</h3>
                <div style={{
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '2rem', 
                  fontWeight: 'bold',
                  backgroundColor: getScoreColor(technicalScore),
                  color: 'white',
                  marginBottom: '12px'
                }}>
                  {technicalScore}
                </div>
                <p style={{color: '#6b7280', fontSize: '14px', marginBottom: '8px'}}>out of 10</p>
                <p style={{color: '#d4af37', fontSize: '16px', fontWeight: 'bold'}}>{getScoreLabel(technicalScore)}</p>
              </div>

              <div style={{
                padding: '24px',
                border: '2px solid #e5e7eb',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: '#f8fafc'
              }}>
                <h3 style={{color: '#d4af37', fontSize: '1.2rem', marginBottom: '16px', fontWeight: '600'}}>Problem Solving</h3>
                <div style={{
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '2rem', 
                  fontWeight: 'bold',
                  backgroundColor: getScoreColor(problemSolvingScore),
                  color: 'white',
                  marginBottom: '12px'
                }}>
                  {problemSolvingScore}
                </div>
                <p style={{color: '#6b7280', fontSize: '14px', marginBottom: '8px'}}>out of 10</p>
                <p style={{color: '#d4af37', fontSize: '16px', fontWeight: 'bold'}}>{getScoreLabel(problemSolvingScore)}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Assessment Section */}
      <section style={{padding: '60px 24px', backgroundColor: '#f8fafc'}}>
        <div style={{maxWidth: '1000px', margin: '0 auto'}}>
          <h2 style={{
            textAlign: 'center',
            color: '#1f2937',
            marginBottom: '40px',
            fontSize: '2rem',
            fontWeight: '700'
          }}>
            Detailed Assessment
          </h2>
          
          {/* Behavioral Interview Section */}
          <div style={{...cardStyle, marginBottom: '32px'}}>
            <h3 style={{color: '#d4af37', fontSize: '1.8rem', marginBottom: '24px', fontWeight: '600'}}>
              🎤 Behavioral Interview
            </h3>
            
            <div style={{...cardStyle, marginBottom: '24px', backgroundColor: '#f8fafc'}}>
              <h4 style={{color: '#d4af37', fontSize: '1.3rem', marginBottom: '16px', fontWeight: '600'}}>Overall Assessment</h4>
              <p style={{color: '#374151', lineHeight: '1.6', fontSize: '16px'}}>{behavioralReport.overall_assessment}</p>
            </div>

            {behavioralReport.strengths && behavioralReport.strengths.length > 0 && (
              <div style={{...cardStyle, marginBottom: '24px', backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe'}}>
                <h4 style={{color: '#d4af37', fontSize: '1.3rem', marginBottom: '16px', fontWeight: '600'}}>💪 Strengths</h4>
                <ul style={{paddingLeft: '24px', color: '#374151', lineHeight: '1.8'}}>
                  {behavioralReport.strengths.map((strength, index) => (
                    <li key={index} style={{marginBottom: '8px'}}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}

            {behavioralReport.areas_for_improvement && behavioralReport.areas_for_improvement.length > 0 && (
              <div style={{...cardStyle, marginBottom: '24px', backgroundColor: '#fef3c7', border: '1px solid #fbbf24'}}>
                <h4 style={{color: '#f59e0b', fontSize: '1.3rem', marginBottom: '16px', fontWeight: '600'}}>📈 Areas for Improvement</h4>
                <ul style={{paddingLeft: '24px', color: '#374151', lineHeight: '1.8'}}>
                  {behavioralReport.areas_for_improvement.map((area, index) => (
                    <li key={index} style={{marginBottom: '8px'}}>{area}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{...cardStyle, backgroundColor: '#f8fafc'}}>
              <h4 style={{color: '#d4af37', fontSize: '1.3rem', marginBottom: '16px', fontWeight: '600'}}>📊 Detailed Scores</h4>
              <div style={{display: 'grid', gap: '16px'}}>
                <div style={{padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb'}}>
                  <strong style={{color: '#d4af37'}}>Technical Proficiency: {technicalScore}/10</strong>
                  <p style={{color: '#374151', marginTop: '8px'}}>{behavioralReport.technical_proficiency?.comment || 'No comment provided'}</p>
                </div>
                <div style={{padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb'}}>
                  <strong style={{color: '#d4af37'}}>Communication Skills: {communicationScore}/10</strong>
                  <p style={{color: '#374151', marginTop: '8px'}}>{behavioralReport.communication_skills?.comment || 'No comment provided'}</p>
                </div>
                <div style={{padding: '16px', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb'}}>
                  <strong style={{color: '#d4af37'}}>Problem Solving: {problemSolvingScore}/10</strong>
                  <p style={{color: '#374151', marginTop: '8px'}}>{behavioralReport.problem_solving?.comment || 'No comment provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* DSA Interview Section (if present) */}
          {dsaReport && dsaReport.question_title && (
            <div style={{...cardStyle, marginBottom: '32px'}}>
              <h3 style={{color: '#d4af37', fontSize: '1.8rem', marginBottom: '24px', fontWeight: '600'}}>
                💻 Algorithm Design Interview
              </h3>
              
              <div style={{...cardStyle, marginBottom: '24px', backgroundColor: '#f8fafc'}}>
                <h4 style={{color: '#d4af37', fontSize: '1.3rem', marginBottom: '16px', fontWeight: '600'}}>Question</h4>
                <p style={{color: '#374151', fontSize: '18px', fontWeight: 'bold'}}>{dsaReport.question_title}</p>
                <p style={{color: '#6b7280', fontSize: '16px', marginTop: '8px'}}>
                  Difficulty: <strong>{dsaReport.difficulty || 'Medium'}</strong>
                </p>
              </div>

              <div style={{...cardStyle, marginBottom: '24px', backgroundColor: '#f8fafc'}}>
                <h4 style={{color: '#d4af37', fontSize: '1.3rem', marginBottom: '16px', fontWeight: '600'}}>Analysis</h4>
                <div style={{display: 'grid', gap: '12px'}}>
                  <div>
                    <strong style={{color: '#d4af37'}}>Classification:</strong>
                    <p style={{color: '#374151', marginTop: '4px'}}>{dsaReport.classification || 'N/A'}</p>
                  </div>
                  <div>
                    <strong style={{color: '#d4af37'}}>Time Complexity:</strong>
                    <p style={{color: '#374151', marginTop: '4px'}}>{dsaReport.time_complexity || 'N/A'}</p>
                  </div>
                  <div>
                    <strong style={{color: '#d4af37'}}>Space Complexity:</strong>
                    <p style={{color: '#374151', marginTop: '4px'}}>{dsaReport.space_complexity || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {dsaReport.strengths && dsaReport.strengths.length > 0 && (
                <div style={{...cardStyle, marginBottom: '24px', backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe'}}>
                  <h4 style={{color: '#d4af37', fontSize: '1.3rem', marginBottom: '16px', fontWeight: '600'}}>💪 Strengths</h4>
                  <ul style={{paddingLeft: '24px', color: '#374151', lineHeight: '1.8'}}>
                    {dsaReport.strengths.map((strength, index) => (
                      <li key={index} style={{marginBottom: '8px'}}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {dsaReport.weaknesses && dsaReport.weaknesses.length > 0 && (
                <div style={{...cardStyle, marginBottom: '24px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5'}}>
                  <h4 style={{color: '#ef4444', fontSize: '1.3rem', marginBottom: '16px', fontWeight: '600'}}>📈 Weaknesses</h4>
                  <ul style={{paddingLeft: '24px', color: '#374151', lineHeight: '1.8'}}>
                    {dsaReport.weaknesses.map((weakness, index) => (
                      <li key={index} style={{marginBottom: '8px'}}>{weakness}</li>
                    ))}
                  </ul>
                </div>
              )}

              {dsaReport.suggested_improvements && dsaReport.suggested_improvements.length > 0 && (
                <div style={{...cardStyle, marginBottom: '24px', backgroundColor: '#f0f9ff', border: '1px solid #bfdbfe'}}>
                  <h4 style={{color: '#d4af37', fontSize: '1.3rem', marginBottom: '16px', fontWeight: '600'}}>💡 Suggested Improvements</h4>
                  <ul style={{paddingLeft: '24px', color: '#374151', lineHeight: '1.8'}}>
                    {dsaReport.suggested_improvements.map((improvement, index) => (
                      <li key={index} style={{marginBottom: '8px'}}>{improvement}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{...cardStyle, backgroundColor: '#f8fafc'}}>
                <h4 style={{color: '#d4af37', fontSize: '1.3rem', marginBottom: '16px', fontWeight: '600'}}>🎯 Recommendation</h4>
                <div style={{
                  padding: '16px',
                  backgroundColor: getRecommendationColor(dsaReport.hire_recommendation === 'yes' ? 'Hire' : (dsaReport.hire_recommendation === 'maybe' ? 'Maybe' : 'No Hire')),
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  textAlign: 'center'
                }}>
                  {dsaReport.hire_recommendation === 'yes' ? '✅ Hire' : (dsaReport.hire_recommendation === 'maybe' ? '🤔 Maybe' : '❌ No Hire')}
                </div>
              </div>
            </div>
          )}

          {/* Key Focus Areas (if present in behavioral report) */}
          {behavioralReport.key_focus_areas && behavioralReport.key_focus_areas.length > 0 && (
            <div style={{...cardStyle, backgroundColor: '#fef3c7', border: '1px solid #fbbf24'}}>
              <h3 style={{color: '#f59e0b', fontSize: '1.5rem', marginBottom: '16px', fontWeight: '600'}}>🎯 Key Focus Areas for Development</h3>
              <ul style={{paddingLeft: '24px', color: '#374151', lineHeight: '1.8'}}>
                {behavioralReport.key_focus_areas.map((area, index) => (
                  <li key={index} style={{marginBottom: '8px'}}>{area}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Action Center Section */}
      <section style={{padding: '60px 24px 80px', backgroundColor: 'white'}}>
        <div style={{maxWidth: '600px', margin: '0 auto'}}>
          <div style={{...cardStyle, textAlign: 'center'}}>
            <h2 style={{color: '#1f2937', fontSize: '1.8rem', marginBottom: '20px', fontWeight: '700'}}>
              Ready for Your Next Career Move?
            </h2>
            <p style={{color: '#6b7280', lineHeight: '1.5', marginBottom: '32px', fontSize: '16px'}}>
              Continue your professional development journey with additional assessments and personalized coaching sessions.
            </p>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <button
                onClick={() => navigate('/')}
                style={{
                  ...buttonStyle,
                  width: '100%',
                  fontSize: '18px',
                  padding: '16px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)';
                }}
              >
                Start New Assessment
              </button>
              <button
                onClick={() => window.print()}
                style={{
                  ...secondaryButtonStyle,
                  width: '100%',
                  fontSize: '18px',
                  padding: '16px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#d4af37';
                  e.target.style.color = '#d4af37';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.color = '#374151';
                }}
              >
                Download Report (Print)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#1f2937',
        color: 'white',
        textAlign: 'center',
        padding: '24px',
        marginTop: '40px'
      }}>
        <p style={{margin: 0, fontSize: '14px'}}>
          © 2025 Mock Me?!. Professional Interview Preparation Platform
        </p>
      </footer>
    </div>
  );
}

export default ReportPage;