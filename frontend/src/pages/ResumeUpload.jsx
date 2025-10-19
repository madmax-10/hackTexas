import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';

const ResumeUpload = ({ setSessionData }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const demo = location.state?.demo;

  if (!demo) {
    navigate('/');
    return null;
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Accept both images and PDFs
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please select an image (JPG, PNG) or PDF file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const response = await apiService.uploadResume(file, demo.id);
      
      // Store session data
      setSessionData({
        sessionId: response.session_id,
        question: response.question,
        question_type: response.question_type,
        difficulty: response.difficulty,
        role: response.role,
        total_questions: response.total_questions,
        current_question_number: response.current_question_number,
        demo: demo,
        answers: [],
      });
      
      // Navigate to interview page
      navigate('/interview');
    } catch (err) {
      setError('Failed to upload resume. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1c1c1c 0%, #2a2a2a 100%)',
      color: '#e0d5c5',
      fontFamily: 'Playfair Display, serif',
      lineHeight: '1.6',
      boxSizing: 'border-box',
      transform: 'perspective(1000px)',
      boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(30, 30, 30, 0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(75, 56, 50, 0.3)',
        padding: '1rem 0',
        transform: 'perspective(1000px) rotateX(0deg)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '1.5rem',
              background: 'linear-gradient(135deg, #d4af37, #b8941f)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
            onClick={() => navigate('/')}
          >
            Mock Me? <span style={{ fontSize: '0.8em', fontWeight: '500', WebkitTextFillColor: undefined, background: 'none' }}>Yes Please</span>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '2rem',
            alignItems: 'center',
          }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#e0d5c5',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'color 0.3s ease',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
              }}
              onMouseEnter={(e) => e.target.style.color = '#d4af37'}
              onMouseLeave={(e) => e.target.style.color = '#e0d5c5'}
            >
              Home
            </button>
            <button
              onClick={() => navigate('/?section=about')}
              style={{
                background: 'none',
                border: 'none',
                color: '#e0d5c5',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'color 0.3s ease',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
              }}
              onMouseEnter={(e) => e.target.style.color = '#d4af37'}
              onMouseLeave={(e) => e.target.style.color = '#e0d5c5'}
            >
              About
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ paddingTop: '5rem' }}>
        {/* Hero Section */}
        <section style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #4b3832 0%, #6b5b47 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            opacity: 0.3,
          }} />
          
          <div style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: '800px',
            margin: '0 auto',
          }}>
            <h1 style={{
              fontSize: '3.5rem',
              fontWeight: '800',
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, #ffffff, #e0e7ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: '1.2',
            }}>
              Resume Analysis
            </h1>
            <p style={{
              fontSize: '1.25rem',
              marginBottom: '2rem',
              opacity: 0.9,
              maxWidth: '600px',
              margin: '0 auto 2rem',
            }}>
              Upload your resume to get personalized interview questions tailored to your experience and career goals.
            </p>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '0.75rem 1.5rem',
              borderRadius: '2rem',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                background: '#10b981',
                borderRadius: '50%',
                animation: 'pulse 2s infinite',
              }} />
              <span style={{ fontWeight: '600' }}>Selected: {demo.title}</span>
            </div>
          </div>
        </section>

        {/* Guidelines Section */}
        <section style={{
          padding: '4rem 2rem',
          maxWidth: '1200px',
          margin: '0 auto',
        }}>
          <div style={{
            background: '#2a2a2a',
            borderRadius: '1rem',
            padding: '3rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 10px 25px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(75, 56, 50, 0.3)',
            transform: 'perspective(1000px) translateZ(10px)',
            transition: 'all 0.3s ease'
          }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '1.5rem',
              color: '#e0d5c5',
              textAlign: 'center',
            }}>
              Document Submission Guidelines
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
              marginTop: '2rem',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #4b3832, #6b5b47)',
                borderRadius: '0.75rem',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                transform: 'perspective(1000px) translateZ(5px)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #d4af37, #b8941f)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#e0d5c5' }}>
                    Clear & Readable
                  </h3>
                  <p style={{ color: '#e0d5c5', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    Ensure your document is well-lit, clearly readable, and in a supported format for the best results.
                  </p>
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                padding: '1.5rem',
                background: 'linear-gradient(135deg, #4b3832, #6b5b47)',
                borderRadius: '0.75rem',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                transform: 'perspective(1000px) translateZ(5px)',
                transition: 'all 0.3s ease'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #d4af37, #b8941f)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#e0d5c5' }}>
                    AI Analysis
                  </h3>
                  <p style={{ color: '#e0d5c5', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    Our AI will analyze your professional background, skills, and experience to generate personalized questions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Upload Section */}
        <section style={{
          padding: '2rem',
          maxWidth: '800px',
          margin: '0 auto 4rem',
        }}>
          <div style={{
            background: '#2a2a2a',
            borderRadius: '1rem',
            padding: '3rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), 0 10px 25px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(75, 56, 50, 0.3)',
            transform: 'perspective(1000px) translateZ(20px)',
            transition: 'all 0.3s ease'
          }}>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '2rem',
              color: '#e0d5c5',
              textAlign: 'center',
            }}>
              Upload Your Resume
            </h2>
            
            {/* Upload Area */}
            <div style={{
              border: '2px dashed #4b3832',
              borderRadius: '1rem',
              padding: '3rem 2rem',
              textAlign: 'center',
              marginBottom: '2rem',
              background: 'linear-gradient(135deg, #2a2a2a, #1c1c1c)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#d4af37';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(212, 175, 55, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#4b3832';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.3)';
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #d4af37, #b8941f)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
              }}>
                <svg width="40" height="40" fill="white" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
              
              <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#e0d5c5',
                }}>
                  Select Document
                </h3>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  style={{ display: 'none' }}
                  accept="image/*,.pdf,application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                <p style={{ color: '#e0d5c5', marginBottom: '0.5rem' }}>
                  Click to browse or drag and drop your resume
                </p>
                <p style={{ color: '#a0a0a0', fontSize: '0.875rem' }}>
                  Supported formats: PNG, JPG, JPEG, PDF (Max 10MB)
                </p>
              </label>
            </div>

            {/* File Selected */}
            {file && (
              <div style={{
                background: 'linear-gradient(135deg, #4b3832, #6b5b47)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #d4af37, #b8941f)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '600', color: '#e0d5c5', margin: '0 0 0.25rem' }}>
                    Document Selected: {file.name}
                  </p>
                  <p style={{ color: '#a0a0a0', fontSize: '0.875rem', margin: 0 }}>
                    File size: {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={{
                background: 'linear-gradient(135deg, #4b3832, #6b5b47)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #d4af37, #b8941f)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </div>
                <p style={{ fontWeight: '600', color: '#e0d5c5', margin: 0 }}>
                  {error}
                </p>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              style={{
                width: '100%',
                background: file && !uploading 
                  ? 'linear-gradient(135deg, #d4af37, #b8941f)' 
                  : 'linear-gradient(135deg, #9ca3af, #6b7280)',
                color: 'white',
                border: 'none',
                borderRadius: '0.75rem',
                padding: '1rem 2rem',
                fontSize: '1.125rem',
                fontWeight: '600',
                cursor: file && !uploading ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                boxShadow: file && !uploading 
                  ? '0 4px 12px rgba(59, 130, 246, 0.4)' 
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              onMouseEnter={(e) => {
                if (file && !uploading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 20px rgba(212, 175, 55, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                if (file && !uploading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.4)';
                }
              }}
            >
              {uploading ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                  Processing Document...
                </>
              ) : (
                <>
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                  </svg>
                  Analyze Resume & Generate Questions
                </>
              )}
            </button>

            {/* Back Button */}
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button 
                onClick={() => navigate('/?section=programs')}
                style={{
                  background: 'none',
                  border: '1px solid #d1d5db',
                  color: '#e0d5c5',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#d4af37';
                  e.target.style.color = '#d4af37';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#4b3832';
                  e.target.style.color = '#e0d5c5';
                }}
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                </svg>
                Return to Jobs
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        background: 'linear-gradient(135deg, #2a2a2a, #1c1c1c)',
        color: '#e0d5c5',
        textAlign: 'center',
        padding: '2rem',
        marginTop: '4rem',
      }}>
        <p style={{ margin: 0, opacity: 0.8 }}>
          © 2025 Mock Me? <span style={{ fontSize: '0.9em', fontWeight: '500' }}>Yes Please</span>. Professional Interview Preparation Platform
        </p>
      </footer>

      {/* Add keyframes for animations */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

export default ResumeUpload;
