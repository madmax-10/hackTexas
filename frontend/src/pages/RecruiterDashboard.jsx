import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { getScoreColor, getRatingColor } from '../utils';
import { colors } from '../constants/theme';
import './RecruiterDashboard.css';

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [statistics, setStatistics] = useState({
    total_interviews: 0,
    average_score: 0,
    excellent_candidates: 0,
    good_candidates: 0,
    average_candidates: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load reports and statistics in parallel
      const [reportsData, statsData] = await Promise.all([
        apiService.getAllReports(),
        apiService.getDashboardStatistics()
      ]);
      
      setReports(reportsData);
      setStatistics(statsData);
      console.log('📊 Dashboard data loaded:', { reports: reportsData, stats: statsData });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    navigate('/login');
  };

  const handleViewReport = (reportId) => {
    navigate(`/report/${reportId}`);
  };

  const handleDeleteReport = async (reportId, reportName) => {
    if (window.confirm(`Are you sure you want to delete the report for ${reportName}?`)) {
      try {
        await apiService.deleteReport(reportId);
        // Reload the dashboard data
        await loadDashboardData();
        console.log('✅ Report deleted successfully');
      } catch (error) {
        console.error('Error deleting report:', error);
        alert('Failed to delete report. Please try again.');
      }
    }
  };

  const handleDecision = async (reportId, decision) => {
    try {
      const response = await apiService.updateReportDecision(reportId, decision);
      // Optimistic UI: update local state
      setReports((prev) => prev.map(r => r.id === reportId ? { ...r, decision } : r));
      
      // Show email status if accepted
      if (decision === 'Accepted') {
        if (response.email_sent) {
          alert(`✅ Decision updated and email sent successfully!\n\n${response.email_message}`);
        } else {
          alert(`⚠️ Decision updated but email failed to send.\n\n${response.email_message}`);
        }
      } else {
        alert(`✅ Decision updated to ${decision}`);
      }
    } catch (error) {
      console.error('Error updating decision:', error);
      alert('Failed to update decision. Please try again.');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="dashboard-error-content">
          <p>{error}</p>
          <button
            onClick={loadDashboardData}
            className="dashboard-button-secondary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div>
            <h1 className="dashboard-header-title">
              Recruiter Dashboard
            </h1>
            <p className="dashboard-header-subtitle">
              Interview Reports & Analytics
            </p>
          </div>
          <div className="dashboard-header-actions">
            <button
              onClick={loadDashboardData}
              className="dashboard-button-secondary"
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="dashboard-button-secondary"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Stats Overview */}
        <div className="dashboard-stats">
          <div className="dashboard-stat-card">
            <h3 className="dashboard-stat-value dashboard-stat-value-primary">
              {statistics.total_interviews}
            </h3>
            <p className="dashboard-stat-label">
              Total Interviews
            </p>
          </div>
          <div className="dashboard-stat-card">
            <h3 className="dashboard-stat-value dashboard-stat-value-success">
              {statistics.average_score}
            </h3>
            <p className="dashboard-stat-label">
              Average Score
            </p>
          </div>
          <div className="dashboard-stat-card">
            <h3 className="dashboard-stat-value dashboard-stat-value-primary">
              {statistics.excellent_candidates}
            </h3>
            <p className="dashboard-stat-label">
              Excellent Candidates
            </p>
          </div>
        </div>

        {/* Reports Table */}
        <div className="dashboard-reports-container">
          <div className="dashboard-reports-header">
            <h2 className="dashboard-reports-title">
              Interview Reports ({reports.length})
            </h2>
          </div>

          {reports.length === 0 ? (
            <div className="dashboard-reports-empty">
              <p className="dashboard-reports-empty-text">
                No interview reports found. Complete some interviews to see reports here.
              </p>
            </div>
          ) : (
            <div className="dashboard-table-wrapper">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Position</th>
                    <th>Date</th>
                    <th>Score</th>
                    <th>Rating</th>
                    <th>Decision</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <div>
                          <div className="dashboard-candidate-name">
                            {report.candidate_name}
                          </div>
                          <div className="dashboard-candidate-email">
                            {report.candidate_email}
                          </div>
                        </div>
                      </td>
                      <td>{report.position}</td>
                      <td>{new Date(report.interview_date).toLocaleDateString()}</td>
                      <td>
                        <span 
                          className="dashboard-score" 
                          style={{ 
                            '--score-color': getScoreColor(report.overall_score)
                          }}
                        >
                          {report.overall_score}%
                        </span>
                      </td>
                      <td>
                        <span 
                          className="dashboard-rating" 
                          style={{
                            '--rating-color': getRatingColor(report.overall_rating),
                            '--rating-background': `${getRatingColor(report.overall_rating)}20`,
                            '--rating-border-color': `${getRatingColor(report.overall_rating)}40`
                          }}
                        >
                          {report.overall_rating}
                        </span>
                      </td>
                      <td>
                        <div className="dashboard-decision-group">
                          <span className={`dashboard-decision-badge ${
                            report.decision === 'Accepted' ? 'dashboard-decision-badge-accepted' :
                            report.decision === 'Declined' ? 'dashboard-decision-badge-declined' :
                            'dashboard-decision-badge-pending'
                          }`}>
                            {report.decision || 'Pending'}
                          </span>
                          <button
                            onClick={() => handleDecision(report.id, 'Accepted')}
                            className="dashboard-decision-button dashboard-decision-button-accept"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDecision(report.id, 'Declined')}
                            className="dashboard-decision-button dashboard-decision-button-decline"
                          >
                            Decline
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="dashboard-actions-group">
                          <button
                            onClick={() => handleViewReport(report.id)}
                            className="dashboard-action-button dashboard-action-button-view"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report.id, report.candidate_name)}
                            className="dashboard-action-button dashboard-action-button-delete"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RecruiterDashboard;
