import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { useSession } from '../contexts/SessionContext';
import { getScoreColor, getScoreLabel, getRecommendationColor, getRecommendationIcon } from '../utils';
import './ReportPage.css';

// ==================== Reusable Components ====================

const ScoreCard = ({ title, score }) => (
  <div className="report-score-card">
    <h3 className="report-score-title">{title}</h3>
    <div 
      className="report-score-circle report-score-circle-dynamic"
      style={{ '--score-bg-color': getScoreColor(score) }}
    >
      {score}
    </div>
    <p className="report-score-label">out of 10</p>
    <p className="report-score-rating">{getScoreLabel(score)}</p>
  </div>
);

const ListSection = ({ title, items, variant = 'blue' }) => {
  if (!items || items.length === 0) return null;
  
  const variantClass = {
    blue: 'report-subsection-blue',
    yellow: 'report-subsection-yellow',
    red: 'report-subsection-red'
  }[variant] || 'report-subsection-blue';
  
  const titleClass = variant === 'yellow' ? 'report-subsection-title report-subsection-title-warning' :
                     variant === 'red' ? 'report-subsection-title report-subsection-title-error' :
                     'report-subsection-title';
  
  return (
    <div className={`report-subsection ${variantClass}`}>
      <h4 className={titleClass}>{title}</h4>
      <ul className="report-list">
        {items.map((item, index) => (
          <li key={index} className="report-list-item">{item}</li>
        ))}
      </ul>
    </div>
  );
};

const MetricCard = ({ metric, score, feedback, evidence }) => (
  <div className="report-metric-card">
    <div className="report-metric-header">
      <h4 className="report-metric-title">{metric}</h4>
      <div 
        className="report-score-circle report-score-circle-dynamic report-metric-score"
        style={{ '--score-bg-color': getScoreColor(score) }}
      >
        {score}
      </div>
    </div>
    <div className="report-metric-content">
      <div className="report-metric-feedback">
        <strong className="report-detail-label">Feedback:</strong>
        <p className="report-detail-value">{feedback}</p>
      </div>
      {evidence && (
        <div className="report-metric-evidence">
          <strong className="report-detail-label">Evidence:</strong>
          <p className="report-detail-value">{evidence}</p>
        </div>
      )}
    </div>
  </div>
);

const NavLink = ({ to, children, onClick }) => (
  <button onClick={() => onClick(to)} className="report-nav-link">
    {children}
  </button>
);

const HireBadge = ({ recommendation }) => {
  const recMap = {
    'Strong Hire': { text: '🎉 Strong Hire', color: 'Strong Hire' },
    'Hire': { text: '✅ Hire', color: 'Hire' },
    'Maybe': { text: '🤔 Maybe', color: 'Maybe' },
    'No Hire': { text: '❌ No Hire', color: 'No Hire' }
  };
  
  const { text, color } = recMap[recommendation] || { text: '❌ No Hire', color: 'No Hire' };
  
  return (
    <div 
      className="report-hire-badge report-hire-badge-dynamic"
      style={{ '--hire-bg-color': getRecommendationColor(color) }}
    >
      {text}
    </div>
  );
};

// ==================== Main Component ====================

function ReportPage() {
  const { sessionData } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { report_data } = location.state || {};

  useEffect(() => {
    if (!report_data) {
      navigate('/');
      return;
    }
  }, [navigate, report_data]);

  const reportData = useMemo(() => {
    if (!report_data) return null;
    return report_data;
  }, [report_data]);

  const scores = useMemo(() => {
    if (!reportData?.evaluation_metrics || reportData.evaluation_metrics.length === 0) {
      return { avg: '0.0' };
    }
    
    const scoreArray = reportData.evaluation_metrics.map(m => m.score).filter(s => s > 0);
    const avg = scoreArray.length > 0 
      ? (scoreArray.reduce((a, b) => a + b, 0) / scoreArray.length).toFixed(1) 
      : '0.0';
    
    return { avg };
  }, [reportData]);

  const scoreCards = [
    { title: 'Overall Score', score: parseFloat(scores.avg) }
  ];

  const navLinks = [
    { to: '/?section=about', label: 'About' },
    { to: '/?section=programs', label: 'Jobs' },
    { to: '/?section=resources', label: 'Resources' }
  ];

  if (!reportData) return null;


  return (
    <div className="report-container">
      <nav className="report-nav">
        <div className="report-nav-container">
          <div className="report-nav-brand" onClick={() => navigate('/?section=home')}>
            <div className="report-nav-logo">M</div>
            <span className="report-nav-title">
              Mock Me? <span className="report-nav-title-subtitle">Yes Please</span>
            </span>
          </div>
          <div className="report-nav-links">
            {navLinks.map(({ to, label }) => (
              <NavLink key={to} to={to} onClick={navigate}>{label}</NavLink>
            ))}
          </div>
        </div>
      </nav>

      <section className="report-header">
        <div className="report-header-container">
          <h1 className="report-header-title">Assessment Report</h1>
          <h2 className="report-header-subtitle">Comprehensive Analysis of Your Performance</h2>
          {reportData.hiring_recommendation && (
            <div className="report-recommendation-badge">
              <span>{getRecommendationIcon(reportData.hiring_recommendation)}</span>
              <span>Recommendation: {reportData.hiring_recommendation}</span>
            </div>
          )}
        </div>
      </section>

      <section className="report-section report-section-white">
        <div className="report-section-container">
          <div className="report-card report-card-center">
            <h2 className="report-section-title">Performance Summary</h2>
            <div className="report-scores-grid">
              {scoreCards.map(({ title, score }) => (
                <ScoreCard key={title} title={title} score={score} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="report-section report-section-gray">
        <div className="report-detail-section">
          <h2 className="report-detail-title">Detailed Assessment</h2>
          
          {reportData.evaluation_metrics && reportData.evaluation_metrics.length > 0 && (
            <div className="report-metrics-section">
              <h3 className="report-section-header">📊 Evaluation Metrics</h3>
              <div className="report-metrics-grid">
                {reportData.evaluation_metrics.map((metric, index) => (
                  <MetricCard
                    key={index}
                    metric={metric.metric}
                    score={metric.score}
                    feedback={metric.feedback}
                    evidence={metric.evidence}
                  />
                ))}
              </div>
            </div>
          )}

          {reportData.hiring_recommendation && (
            <div className="report-subsection">
              <h4 className="report-subsection-title">🎯 Hiring Recommendation</h4>
              <HireBadge recommendation={reportData.hiring_recommendation} />
            </div>
          )}

          <ListSection 
            title="🚩 Red Flags" 
            items={reportData.red_flags} 
            variant="red" 
          />
        </div>
      </section>

      <section className="report-action-section">
        <div className="report-action-container">
          <div className="report-card report-card-center">
            <h2 className="report-action-title">Ready for Your Next Career Move?</h2>
            <p className="report-action-description">
              Continue your professional development journey with additional assessments and personalized coaching sessions.
            </p>
            <div className="report-action-buttons">
              <button onClick={() => navigate('/')} className="report-button-primary">
                Start New Assessment
              </button>
              <button onClick={() => window.print()} className="report-button-secondary">
                Download Report (Print)
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="report-footer">
        <p className="report-footer-text">
          © 2025 Mock Me? <span className="landing-text-small-footer">Yes Please</span>. Professional Interview Preparation Platform
        </p>
      </footer>
    </div>
  );
}

export default ReportPage;