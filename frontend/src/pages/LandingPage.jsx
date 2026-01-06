import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../services/api';
import './LandingPage.css';
import LoadingSpinner from '../components/LoadingSpinner';
import Navigation from '../components/Navigation';
import Button from '../components/Button';

const LandingPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('home');
  const navigate = useNavigate();
  const location = useLocation();


  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await apiService.getJobs();
      setJobs(data);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      // Fallback to mock data if API fails
      // const mockDemos = [
      //   {
      //     id: 1,
      //     title: "Software Engineering",
      //     description: "Practice coding and system design questions for software engineering roles",
      //     icon: "💻",
      //     color: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
      //   },
      //   {
      //     id: 2,
      //     title: "Product Manager",
      //     description: "Behavioral and product strategy questions for PM positions",
      //     icon: "📊",
      //     color: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
      //   },
      //   {
      //     id: 3,
      //     title: "Data Science",
      //     description: "Technical and analytical questions for data science roles",
      //     icon: "📈",
      //     color: "linear-gradient(135deg, #d4af37 0%, #b8941f 100%)"
      //   }
      // ];
      // setJobs(mockJobs);
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterview = (job) => {
    navigate('/upload', { state: { job: job } });
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
    return <LoadingSpinner message="Loading your interview prep..." />;
  }

  return (
    <div className="landing-container">
      {/* Modern Navigation */}
      <Navigation activeSection={activeSection} onNavClick={handleNav} />

      {/* Hero Section */}
      {activeSection === 'home' && (
        <section className="landing-hero">
          <div className="landing-hero-overlay"></div>
          
          <div className="landing-hero-content">
            <div className="landing-hero-content-center">
              <h1 className="landing-hero-title">
                Master Your
                <span className="landing-hero-title-gradient"> Interview Skills</span>
              </h1>
              <p className="landing-hero-description">
                Practice with AI-powered interviews tailored to your role. Get instant feedback, 
                improve your confidence, and land your dream job.
              </p>
              
              <div className="landing-hero-buttons">
                <div className="landing-hero-buttons-wrapper">
                  <Button 
                    variant="primary"
                    onClick={() => jobs.length > 0 && handleStartInterview(jobs[0])}
                    className="landing-hero-button-large"
                  >
                    Start Free Practice
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => setActiveSection('programs')}
                    className="landing-hero-button-large"
                  >
                    Explore Programs
                  </Button>
                </div>
              </div>
        
              {/* Stats */}
              <div className="landing-stats">
                <div className="landing-stat landing-stat-animation-1">
                  <div className="landing-stat-value">10,000+</div>
                  <div className="landing-stat-label">Interviews Completed</div>
                </div>
                <div className="landing-stat landing-stat-animation-2">
                  <div className="landing-stat-value">95%</div>
                  <div className="landing-stat-label">Success Rate</div>
                </div>
                <div className="landing-stat landing-stat-animation-3">
                  <div className="landing-stat-value">24/7</div>
                  <div className="landing-stat-label">Available Practice</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      {activeSection === 'home' && (
        <section className="landing-features">
          <div className="landing-features-container">
            <div className="landing-features-header">
              <h2 className="landing-features-title">
                Why Choose Mock Me? <span className="landing-text-small">Yes Please</span>
              </h2>
              <p className="landing-features-description">
                Our AI-powered platform provides personalized interview practice that adapts to your needs.
              </p>
            </div>

            <div className="landing-features-grid">
              <div className="landing-feature-card landing-feature-card-animation">
                <div className="landing-feature-icon">🎯</div>
                <h3 className="landing-feature-title">Personalized Questions</h3>
                <p className="landing-feature-description">
                  AI generates questions based on your resume and target role for maximum relevance.
                </p>
              </div>

              <div className="landing-feature-card">
                <div className="landing-feature-icon">⚡</div>
                <h3 className="landing-feature-title">Instant Feedback</h3>
                <p className="landing-feature-description">
                  Get real-time analysis of your responses with actionable improvement suggestions.
                </p>
              </div>

              <div className="landing-feature-card">
                <div className="landing-feature-icon">📊</div>
                <h3 className="landing-feature-title">Detailed Reports</h3>
                <p className="landing-feature-description">
                  Comprehensive performance analytics to track your progress over time.
                </p>
              </div>
            </div>
        </div>
      </section>
      )}

      {/* Programs Section */}
      {activeSection === 'programs' && (
        <section className="landing-programs">
          <div className="landing-programs-container">
            <div className="landing-programs-header">
              <h2 className="landing-programs-title">
                Choose Your Practice Track
              </h2>
              <p className="landing-programs-description">
                Select from our specialized interview tracks designed for different career paths.
              </p>
            </div>

            <div className="landing-programs-grid">
              {jobs.map((job, index) => (
                <div 
                  key={job.id} 
                  className="landing-program-card landing-program-card-animation"
                >
                  <div className="landing-program-card-top-bar"></div>
                  <div className="landing-program-icon">{job.icon}</div>
                  <h3 className="landing-program-title">{job.title}</h3>
                  <p className="landing-program-description">{job.description}</p>
                  <button 
                    onClick={() => handleStartInterview(job)}
                    className="landing-program-button"
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
        <section className="landing-cta">
          <div className="landing-cta-container">
            <h2 className="landing-cta-title">
              Ready to Ace Your Next Interview?
            </h2>
            <p className="landing-cta-description">
              Join thousands of professionals who have improved their interview skills with our AI-powered platform.
            </p>
            <div className="landing-cta-buttons">
              <button 
                onClick={() => jobs.length > 0 && handleStartInterview(jobs[0])}
                className="landing-cta-button-primary"
              >
                Start Free Practice
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="landing-cta-button-secondary"
              >
                Create Account
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="landing-footer-grid">
            <div>
              <div className="landing-footer-brand">
                <div className="landing-footer-logo">M</div>
                <span className="landing-footer-title">Mock Me? <span className="landing-text-small">Yes Please</span></span>
              </div>
              <p className="landing-footer-description">
                The ultimate AI-powered interview preparation platform. Practice with confidence, 
                get instant feedback, and land your dream job.
              </p>
            </div>
            
            <div>
              <h3 className="landing-footer-section-title">Product</h3>
              <div className="landing-footer-links">
                <button 
                  onClick={() => handleNav('programs')}
                  className="landing-footer-link"
                >
                  Practice Tracks
                </button>
                <button 
                  onClick={() => handleNav('about')}
                  className="landing-footer-link"
                >
                  About
                </button>
                <button 
                  onClick={() => handleNav('resources')}
                  className="landing-footer-link"
                >
                  Resources
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="landing-footer-section-title">Support</h3>
              <div className="landing-footer-links">
                <a href="#" className="landing-footer-link-anchor">
                  Help Center
                </a>
                <a href="#" className="landing-footer-link-anchor">
                  Contact Us
                </a>
                <a href="#" className="landing-footer-link-anchor">
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
          
          <div className="landing-footer-bottom">
            <p>&copy; 2025 Mock Me? <span className="landing-text-small-footer">Yes Please</span>. All rights reserved. Professional Interview Preparation Platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;