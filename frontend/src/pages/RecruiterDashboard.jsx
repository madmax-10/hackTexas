import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import reportApiService from '../services/reportApiService';

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
        reportApiService.getAllReports(),
        reportApiService.getDashboardStatistics()
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
        await reportApiService.deleteReport(reportId);
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
      const response = await reportApiService.updateReportDecision(reportId, decision);
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

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981'; // Green
    if (score >= 80) return '#d4af37'; // Gold
    if (score >= 70) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'Excellent': return '#10b981';
      case 'Good': return '#d4af37';
      case 'Average': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #2a2a2a 0%, #1c1c1c 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#d4af37',
        fontSize: '18px'
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
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #2a2a2a 0%, #1c1c1c 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ef4444',
        fontSize: '18px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p>{error}</p>
          <button
            onClick={loadDashboardData}
            style={{
              marginTop: '16px',
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid #d4af37',
              background: 'transparent',
              color: '#d4af37',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#d4af37';
              e.target.style.color = '#1c1c1c';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.color = '#d4af37';
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #2a2a2a 0%, #1c1c1c 100%)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #4b3832 0%, #6b5b47 100%)',
        padding: '20px 0',
        borderBottom: '2px solid #d4af37',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              color: '#d4af37',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '0'
            }}>
              Recruiter Dashboard
            </h1>
            <p style={{
              color: '#e0d5c5',
              fontSize: '14px',
              margin: '5px 0 0 0'
            }}>
              Interview Reports & Analytics
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={loadDashboardData}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #d4af37',
                background: 'transparent',
                color: '#d4af37',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#d4af37';
                e.target.style.color = '#1c1c1c';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#d4af37';
              }}
            >
              Refresh
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid #d4af37',
                background: 'transparent',
                color: '#d4af37',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#d4af37';
                e.target.style.color = '#1c1c1c';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = '#d4af37';
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        {/* Stats Overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #4b3832 0%, #6b5b47 100%)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #d4af37',
            textAlign: 'center',
            transform: 'perspective(1000px) translateZ(0)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              color: '#d4af37',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '0 0 10px 0'
            }}>
              {statistics.total_interviews}
            </h3>
            <p style={{
              color: '#e0d5c5',
              fontSize: '14px',
              margin: '0'
            }}>
              Total Interviews
            </p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #4b3832 0%, #6b5b47 100%)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #d4af37',
            textAlign: 'center',
            transform: 'perspective(1000px) translateZ(0)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              color: '#10b981',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '0 0 10px 0'
            }}>
              {statistics.average_score}
            </h3>
            <p style={{
              color: '#e0d5c5',
              fontSize: '14px',
              margin: '0'
            }}>
              Average Score
            </p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #4b3832 0%, #6b5b47 100%)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #d4af37',
            textAlign: 'center',
            transform: 'perspective(1000px) translateZ(0)',
            transition: 'all 0.3s ease'
          }}>
            <h3 style={{
              color: '#d4af37',
              fontSize: '24px',
              fontWeight: 'bold',
              margin: '0 0 10px 0'
            }}>
              {statistics.excellent_candidates}
            </h3>
            <p style={{
              color: '#e0d5c5',
              fontSize: '14px',
              margin: '0'
            }}>
              Excellent Candidates
            </p>
          </div>
        </div>

        {/* Reports Table */}
        <div style={{
          background: 'linear-gradient(135deg, #4b3832 0%, #6b5b47 100%)',
          borderRadius: '12px',
          border: '1px solid #d4af37',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #d4af37',
            background: 'rgba(212, 175, 55, 0.1)'
          }}>
            <h2 style={{
              color: '#d4af37',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0'
            }}>
              Interview Reports ({reports.length})
            </h2>
          </div>

          {reports.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#e0d5c5'
            }}>
              <p style={{ fontSize: '16px', margin: '0' }}>
                No interview reports found. Complete some interviews to see reports here.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{
                    background: 'rgba(212, 175, 55, 0.1)',
                    borderBottom: '1px solid #d4af37'
                  }}>
                    <th style={{
                      padding: '15px',
                      textAlign: 'left',
                      color: '#d4af37',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>Candidate</th>
                    <th style={{
                      padding: '15px',
                      textAlign: 'left',
                      color: '#d4af37',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>Position</th>
                    <th style={{
                      padding: '15px',
                      textAlign: 'left',
                      color: '#d4af37',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>Date</th>
                    <th style={{
                      padding: '15px',
                      textAlign: 'left',
                      color: '#d4af37',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>Score</th>
                    <th style={{
                      padding: '15px',
                      textAlign: 'left',
                      color: '#d4af37',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>Rating</th>
                    <th style={{
                      padding: '15px',
                      textAlign: 'left',
                      color: '#d4af37',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>Decision</th>
                    <th style={{
                      padding: '15px',
                      textAlign: 'left',
                      color: '#d4af37',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report, index) => (
                    <tr key={report.id} style={{
                      borderBottom: index < reports.length - 1 ? '1px solid rgba(212, 175, 55, 0.2)' : 'none'
                    }}>
                      <td style={{
                        padding: '15px',
                        color: '#e0d5c5',
                        fontSize: '14px'
                      }}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#d4af37' }}>
                            {report.candidate_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            {report.candidate_email}
                          </div>
                        </div>
                      </td>
                      <td style={{
                        padding: '15px',
                        color: '#e0d5c5',
                        fontSize: '14px'
                      }}>
                        {report.position}
                      </td>
                      <td style={{
                        padding: '15px',
                        color: '#e0d5c5',
                        fontSize: '14px'
                      }}>
                        {new Date(report.interview_date).toLocaleDateString()}
                      </td>
                      <td style={{
                        padding: '15px',
                        color: '#e0d5c5',
                        fontSize: '14px'
                      }}>
                        <span style={{
                          color: getScoreColor(report.overall_score),
                          fontWeight: '600'
                        }}>
                          {report.overall_score}%
                        </span>
                      </td>
                      <td style={{
                        padding: '15px',
                        color: '#e0d5c5',
                        fontSize: '14px'
                      }}>
                        <span style={{
                          color: getRatingColor(report.overall_rating),
                          fontWeight: '600',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          background: `${getRatingColor(report.overall_rating)}20`,
                          border: `1px solid ${getRatingColor(report.overall_rating)}40`
                        }}>
                          {report.overall_rating}
                        </span>
                      </td>
                      <td style={{
                        padding: '15px',
                        color: '#e0d5c5',
                        fontSize: '14px'
                      }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {/* Decision status pill */}
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            border: `1px solid ${report.decision === 'Accepted' ? '#10b981' : report.decision === 'Declined' ? '#ef4444' : '#9ca3af'}`,
                            color: report.decision === 'Accepted' ? '#10b981' : report.decision === 'Declined' ? '#ef4444' : '#9ca3af',
                            background: `${report.decision === 'Accepted' ? '#10b981' : report.decision === 'Declined' ? '#ef4444' : '#9ca3af'}20`,
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {report.decision || 'Pending'}
                          </span>
                          {/* Accept / Decline */}
                          <button
                            onClick={() => handleDecision(report.id, 'Accepted')}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #10b981',
                              background: 'transparent',
                              color: '#10b981',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#10b981';
                              e.target.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'transparent';
                              e.target.style.color = '#10b981';
                            }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDecision(report.id, 'Declined')}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #ef4444',
                              background: 'transparent',
                              color: '#ef4444',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#ef4444';
                              e.target.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'transparent';
                              e.target.style.color = '#ef4444';
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      </td>
                      <td style={{
                        padding: '15px',
                        color: '#e0d5c5',
                        fontSize: '14px'
                      }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleViewReport(report.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #d4af37',
                              background: 'transparent',
                              color: '#d4af37',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#d4af37';
                              e.target.style.color = '#1c1c1c';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'transparent';
                              e.target.style.color = '#d4af37';
                            }}
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report.id, report.candidate_name)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #ef4444',
                              background: 'transparent',
                              color: '#ef4444',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#ef4444';
                              e.target.style.color = '#ffffff';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = 'transparent';
                              e.target.style.color = '#ef4444';
                            }}
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
