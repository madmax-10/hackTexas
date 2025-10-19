import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';

const LandingPage = () => {
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('home');
  const navigate = useNavigate();
  const location = useLocation();

  // Add CSS animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInUp {
        from {
          transform: translateY(50px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes fadeInLeft {
        from {
          transform: translateX(-50px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes fadeInRight {
        from {
          transform: translateX(50px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes scaleIn {
        from {
          transform: scale(0.8);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
      @keyframes bounceIn {
        0% {
          transform: scale(0.3);
          opacity: 0;
        }
        50% {
          transform: scale(1.05);
        }
        70% {
          transform: scale(0.9);
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      @keyframes rotateInLeft {
        from {
          transform: rotate(-180deg) translateX(-100px);
          opacity: 0;
        }
        to {
          transform: rotate(0deg) translateX(0);
          opacity: 1;
        }
      }
      @keyframes rotateInRight {
        from {
          transform: rotate(180deg) translateX(100px);
          opacity: 0;
        }
        to {
          transform: rotate(0deg) translateX(0);
          opacity: 1;
        }
      }
      @keyframes rotateInCenter {
        from {
          transform: rotate(360deg) scale(0.5);
          opacity: 0;
        }
        to {
          transform: rotate(0deg) scale(1);
          opacity: 1;
        }
      }
      @keyframes slideInDown {
        from {
          transform: translateY(-50px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes zoomIn {
        from {
          transform: scale(0);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
      @keyframes flipInX {
        from {
          transform: perspective(400px) rotateX(90deg);
          opacity: 0;
        }
        to {
          transform: perspective(400px) rotateX(0deg);
          opacity: 1;
        }
      }
      @keyframes pulse {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
        100% {
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    fetchDemos();
  }, []);

  const fetchDemos = async () => {
    try {
      setLoading(true);
      const data = await apiService.getDemos();
      setDemos(data);
    } catch (err) {
      console.error('Error fetching demos:', err);
      // Fallback to mock data if API fails
      const mockDemos = [
        {
          id: 1,
          title: "Software Engineering",
          description: "Practice coding and system design questions for software engineering roles",
          icon: "💻",
          color: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
        },
        {
          id: 2,
          title: "Product Manager",
          description: "Behavioral and product strategy questions for PM positions",
          icon: "📊",
          color: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
        },
        {
          id: 3,
          title: "Data Science",
          description: "Technical and analytical questions for data science roles",
          icon: "📈",
          color: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
        }
      ];
      setDemos(mockDemos);
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = (demo) => {
    navigate('/upload', { state: { demo: demo } });
  };

  // Sync active section with ?section= query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('section');
    const allowed = ['home', 'about', 'programs', 'resources'];
    if (section && allowed.includes(section)) {
      setActiveSection(section);
    }
  }, [location.search]);

  // Helper to navigate and update URL
  const handleNav = (section) => {
    setActiveSection(section);
    navigate(`/?section=${section}`);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1c1c1c 0%, #2a2a2a 100%)',
        fontFamily: 'Playfair Display, serif'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #4b3832',
            borderTop: '4px solid #d4af37',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{
            color: '#e0d5c5',
            fontSize: '18px',
            fontWeight: '500'
          }}>Loading your interview prep...</p>
        </div>
      </div>
    );
  }

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1c1c1c 0%, #2a2a2a 100%)',
    fontFamily: 'Playfair Display, serif',
    color: '#e0d5c5',
    lineHeight: '1.6'
  };

  const navStyle = {
    background: 'rgba(30, 30, 30, 0.9)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid #4b3832',
    position: 'sticky',
    top: '0',
    zIndex: '50',
    transform: 'perspective(1000px) rotateX(0deg)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
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
    color: '#e0d5c5',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
    border: '2px solid #4b3832',
    cursor: 'pointer',
    transform: 'perspective(1000px) translateZ(0)',
    boxShadow: '0 4px 15px rgba(75, 56, 50, 0.2)',
    transition: 'all 0.3s ease'
  };

  return (
    <div style={containerStyle}>
      {/* Modern Navigation */}
      <nav style={navStyle}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '64px'
          }}>
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
              onClick={() => handleNav('home')}
            >
              <div style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1c1c1c',
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
              gap: '32px'
            }}>
              <button 
                onClick={() => handleNav('about')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeSection === 'about' ? '#d4af37' : '#e0d5c5',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'color 0.3s ease'
                }}
              >
                About
              </button>
              <button 
                onClick={() => handleNav('programs')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeSection === 'programs' ? '#d4af37' : '#e0d5c5',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'color 0.3s ease'
                }}
              >
                Practice
              </button>
              <button 
                onClick={() => handleNav('resources')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: activeSection === 'resources' ? '#d4af37' : '#e0d5c5',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'color 0.3s ease'
                }}
              >
                Resources
              </button>
              <button 
                onClick={() => navigate('/login')}
                style={buttonStyle}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'perspective(1000px) translateY(-5px) translateZ(10px) rotateX(5deg)';
                  e.target.style.boxShadow = '0 15px 35px rgba(212, 175, 55, 0.5), 0 8px 25px rgba(212, 175, 55, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'perspective(1000px) translateZ(0)';
                  e.target.style.boxShadow = '0 8px 25px rgba(212, 175, 55, 0.4), 0 4px 15px rgba(212, 175, 55, 0.3)';
                }}
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      {activeSection === 'home' && (
        <section style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1c1c1c 0%, #2a2a2a 100%)',
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          transform: 'perspective(1000px)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)'
        }}>
          <div style={{
            position: 'absolute',
            inset: '0',
            background: 'linear-gradient(135deg, #4b3832 0%, #6b5b47 100%)',
            opacity: '0.3'
          }}></div>
          
          <div style={{
            position: 'relative',
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '80px 16px',
            width: '100%',
            transform: 'perspective(1000px) translateZ(20px)',
            zIndex: 2
          }}>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{
                fontSize: '3.75rem',
                fontWeight: '700',
                color: '#e0d5c5',
                marginBottom: '24px',
                lineHeight: '1.2'
              }}>
                Master Your
                <span style={{
                  background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}> Interview Skills</span>
              </h1>
              <p style={{
                fontSize: '20px',
                color: '#e0d5c5',
                marginBottom: '32px',
                maxWidth: '768px',
                margin: '0 auto 32px auto',
                lineHeight: '1.6'
              }}>
                Practice with AI-powered interviews tailored to your role. Get instant feedback, 
                improve your confidence, and land your dream job.
              </p>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: '64px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  flexWrap: 'wrap', 
                  justifyContent: 'center',
                  animation: 'scaleIn 0.8s ease-out 0.3s both'
                }}>
                  <button 
                    onClick={() => demos.length > 0 && handleStartInterview(demos[0])}
                    style={{
                      ...buttonStyle,
                      padding: '16px 32px',
                      fontSize: '18px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'perspective(1000px) translateY(-5px) translateZ(10px) rotateX(5deg)';
                      e.target.style.boxShadow = '0 15px 35px rgba(212, 175, 55, 0.5), 0 8px 25px rgba(212, 175, 55, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'perspective(1000px) translateZ(0)';
                      e.target.style.boxShadow = '0 8px 25px rgba(212, 175, 55, 0.4), 0 4px 15px rgba(212, 175, 55, 0.3)';
                    }}
                  >
                    Start Free Practice
                  </button>
                  <button 
                    onClick={() => setActiveSection('programs')}
                    style={{
                      ...secondaryButtonStyle,
                      padding: '16px 32px',
                      fontSize: '18px'
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
                    Explore Programs
                  </button>
                </div>
          </div>
        
              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '32px',
                maxWidth: '1024px',
                margin: '0 auto'
              }}>
                <div style={{ 
                  textAlign: 'center',
                  animation: 'bounceIn 1s ease-out 0.5s both'
                }}>
                  <div style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#d4af37',
                    marginBottom: '8px'
                  }}>10,000+</div>
                  <div style={{ color: '#e0d5c5' }}>Interviews Completed</div>
                </div>
                <div style={{ 
                  textAlign: 'center',
                  animation: 'bounceIn 1s ease-out 0.7s both'
                }}>
                  <div style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#d4af37',
                    marginBottom: '8px'
                  }}>95%</div>
                  <div style={{ color: '#e0d5c5' }}>Success Rate</div>
          </div>
                <div style={{ 
                  textAlign: 'center',
                  animation: 'bounceIn 1s ease-out 0.9s both'
                }}>
                  <div style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: '#d4af37',
                    marginBottom: '8px'
                  }}>24/7</div>
                  <div style={{ color: '#e0d5c5' }}>Available Practice</div>
            </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Features Section */}
      {activeSection === 'home' && (
        <section style={{
          padding: '80px 16px',
          background: 'linear-gradient(135deg, #2a2a2a 0%, #1c1c1c 100%)'
        }}>
          <div style={{
            maxWidth: '1280px',
            margin: '0 auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <h2 style={{
                fontSize: '2.25rem',
                fontWeight: '700',
                color: '#e0d5c5',
                marginBottom: '16px'
              }}>
                Why Choose Mock Me?!
              </h2>
              <p style={{
                fontSize: '20px',
                color: '#e0d5c5',
                maxWidth: '512px',
                margin: '0 auto'
              }}>
                Our AI-powered platform provides personalized interview practice that adapts to your needs.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '32px'
            }}>
              <div style={{
                textAlign: 'center',
                padding: '32px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #4b3832 0%, #6b5b47 100%)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                transform: 'perspective(1000px) translateZ(0)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)',
                animation: 'rotateInLeft 1s ease-out 0.2s both'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'perspective(1000px) translateY(-5px) translateZ(10px)';
                e.target.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.4), 0 8px 20px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'perspective(1000px) translateZ(0)';
                e.target.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)';
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px auto',
                  fontSize: '24px'
                }}>
                  🎯
                </div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#e0d5c5',
                  marginBottom: '16px'
                }}>Personalized Questions</h3>
                <p style={{
                  color: '#e0d5c5',
                  lineHeight: '1.6'
                }}>
                  AI generates questions based on your resume and target role for maximum relevance.
                </p>
              </div>

              <div style={{
                textAlign: 'center',
                padding: '32px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #4b3832 0%, #6b5b47 100%)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'perspective(1000px) translateY(-5px) translateZ(10px)';
                e.target.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.4), 0 8px 20px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'perspective(1000px) translateZ(0)';
                e.target.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)';
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px auto',
                  fontSize: '24px'
                }}>
                  ⚡
                </div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#e0d5c5',
                  marginBottom: '16px'
                }}>Instant Feedback</h3>
                <p style={{
                  color: '#e0d5c5',
                  lineHeight: '1.6'
                }}>
                  Get real-time analysis of your responses with actionable improvement suggestions.
                </p>
              </div>

              <div style={{
                textAlign: 'center',
                padding: '32px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #4b3832 0%, #6b5b47 100%)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'perspective(1000px) translateY(-5px) translateZ(10px)';
                e.target.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.4), 0 8px 20px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'perspective(1000px) translateZ(0)';
                e.target.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.3), 0 4px 15px rgba(0, 0, 0, 0.2)';
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px auto',
                  fontSize: '24px'
                }}>
                  📊
                </div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#e0d5c5',
                  marginBottom: '16px'
                }}>Detailed Reports</h3>
                <p style={{
                  color: '#e0d5c5',
                  lineHeight: '1.6'
                }}>
                  Comprehensive performance analytics to track your progress over time.
                </p>
              </div>
            </div>
        </div>
      </section>
      )}

      {/* Programs Section */}
      {activeSection === 'programs' && (
        <section style={{
          padding: '80px 16px',
          background: 'linear-gradient(135deg, #2a2a2a 0%, #1c1c1c 100%)'
        }}>
          <div style={{
            maxWidth: '1280px',
            margin: '0 auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <h2 style={{
                fontSize: '2.25rem',
                fontWeight: '700',
                color: '#e0d5c5',
                marginBottom: '16px'
              }}>
                Choose Your Practice Track
              </h2>
              <p style={{
                fontSize: '20px',
                color: '#e0d5c5',
                maxWidth: '512px',
                margin: '0 auto'
              }}>
                Select from our specialized interview tracks designed for different career paths.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '32px'
            }}>
          {demos.map((demo, index) => (
                <div key={demo.id} style={{
                  background: 'linear-gradient(135deg, #4b3832 0%, #6b5b47 100%)',
                  borderRadius: '16px',
                  padding: '32px',
                  boxShadow: '0 10px 30px rgba(212, 175, 55, 0.3), 0 4px 15px rgba(212, 175, 55, 0.2)',
                  border: '1px solid rgba(212, 175, 55, 0.3)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  transform: 'perspective(1000px) translateZ(0)',
                  animation: `slideInUp 0.8s ease-out ${0.2 + index * 0.2}s both`
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'perspective(1000px) translateY(-5px) translateZ(10px)';
                  e.target.style.boxShadow = '0 15px 35px rgba(212, 175, 55, 0.4), 0 8px 20px rgba(212, 175, 55, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'perspective(1000px) translateZ(0)';
                  e.target.style.boxShadow = '0 10px 30px rgba(212, 175, 55, 0.3), 0 4px 15px rgba(212, 175, 55, 0.2)';
                }}>
                  <div style={{
                    height: '4px',
                    background: demo.color,
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0'
                  }}></div>
                  <div style={{
                    fontSize: '32px',
                    marginBottom: '16px'
                  }}>{demo.icon}</div>
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#e0d5c5',
                    marginBottom: '12px'
                  }}>{demo.title}</h3>
                  <p style={{
                    color: '#e0d5c5',
                    lineHeight: '1.6',
                    marginBottom: '24px'
                  }}>{demo.description}</p>
                  <button 
                    onClick={() => handleStartInterview(demo)}
                    style={{
                      width: '100%',
                      background: demo.color || 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                      backgroundColor: '#d4af37',
                      color: 'white',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)',
                      transform: 'perspective(1000px) translateZ(0)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'perspective(1000px) translateY(-3px) translateZ(5px)';
                      e.target.style.boxShadow = '0 12px 30px rgba(212, 175, 55, 0.4), 0 6px 20px rgba(212, 175, 55, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'perspective(1000px) translateZ(0)';
                      e.target.style.boxShadow = '0 4px 15px rgba(212, 175, 55, 0.2)';
                    }}
                  >
                    Start Practice
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      {activeSection === 'home' && (
        <section style={{
          padding: '80px 16px',
          background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
          color: 'white'
        }}>
          <div style={{
            maxWidth: '1024px',
            margin: '0 auto',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: '2.25rem',
              fontWeight: '700',
              marginBottom: '24px',
              animation: 'fadeInLeft 0.8s ease-out 0.2s both'
            }}>
              Ready to Ace Your Next Interview?
            </h2>
            <p style={{
              fontSize: '20px',
              color: 'rgba(255, 255, 255, 0.9)',
              marginBottom: '32px',
              maxWidth: '512px',
              margin: '0 auto 32px auto',
              animation: 'fadeInRight 0.8s ease-out 0.4s both'
            }}>
              Join thousands of professionals who have improved their interview skills with our AI-powered platform.
            </p>
            <div style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap',
              animation: 'scaleIn 0.8s ease-out 0.6s both'
            }}>
              <button 
                onClick={() => demos.length > 0 && handleStartInterview(demos[0])}
                style={{
                  background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
                  backgroundColor: '#d4af37',
                  color: '#1c1c1c',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '18px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 10px 25px rgba(212, 175, 55, 0.3), 0 4px 15px rgba(212, 175, 55, 0.2)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'perspective(1000px) translateY(-3px) translateZ(5px)';
                  e.target.style.boxShadow = '0 15px 35px rgba(212, 175, 55, 0.4), 0 8px 25px rgba(212, 175, 55, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'perspective(1000px) translateZ(0)';
                  e.target.style.boxShadow = '0 10px 25px rgba(212, 175, 55, 0.3), 0 4px 15px rgba(212, 175, 55, 0.2)';
                }}
              >
                Start Free Practice
              </button>
              <button 
                onClick={() => navigate('/login')}
                style={{
                  background: 'transparent',
                  color: 'white',
                  padding: '16px 32px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  fontSize: '18px',
                  border: '2px solid white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.color = '#d4af37';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = 'white';
                }}
              >
                Create Account
              </button>
            </div>
        </div>
      </section>
      )}

      {/* Footer */}
      <footer style={{
        background: '#2a2a2a',
        color: 'white',
        padding: '48px 16px'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '32px',
            marginBottom: '32px'
          }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px'
              }}>
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
                  fontWeight: 'bold'
                }}>Mock Me?!</span>
              </div>
              <p style={{
                color: '#9ca3af',
                maxWidth: '400px',
                lineHeight: '1.6'
              }}>
                The ultimate AI-powered interview preparation platform. Practice with confidence, 
                get instant feedback, and land your dream job.
              </p>
            </div>
            
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '16px'
              }}>Product</h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <button 
                  onClick={() => handleNav('programs')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#e0d5c5',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'color 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#d4af37'}
                  onMouseLeave={(e) => e.target.style.color = '#e0d5c5'}
                >
                  Practice Tracks
                </button>
                <button 
                  onClick={() => handleNav('about')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#e0d5c5',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'color 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#d4af37'}
                  onMouseLeave={(e) => e.target.style.color = '#e0d5c5'}
                >
                  About
                </button>
                <button 
                  onClick={() => handleNav('resources')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#e0d5c5',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'color 0.3s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#d4af37'}
                  onMouseLeave={(e) => e.target.style.color = '#e0d5c5'}
                >
                  Resources
                </button>
              </div>
            </div>
            
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '16px'
              }}>Support</h3>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <a href="#" style={{
                  color: '#9ca3af',
                  textDecoration: 'none',
                  transition: 'color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = 'white'}
                onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
                >
                  Help Center
                </a>
                <a href="#" style={{
                  color: '#9ca3af',
                  textDecoration: 'none',
                  transition: 'color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = 'white'}
                onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
                >
                  Contact Us
                </a>
                <a href="#" style={{
                  color: '#9ca3af',
                  textDecoration: 'none',
                  transition: 'color 0.3s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = 'white'}
                onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
                >
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
          
          <div style={{
            borderTop: '1px solid #374151',
            paddingTop: '32px',
            textAlign: 'center',
            color: '#9ca3af'
          }}>
            <p>&copy; 2025 Mock Me?!. All rights reserved. Professional Interview Preparation Platform</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;