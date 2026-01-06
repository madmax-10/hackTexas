import axios from 'axios';

// API Configuration
export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api';
export const API_TIMEOUT = 30000; // 30 seconds

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT,
});

// Helper function for safe API calls with fallback
const safeApiCall = async (apiCall, fallback = null) => {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API call failed:', error);
    if (fallback !== null) {
      console.log('Using fallback data');
      return fallback;
    }
    throw error;
  }
};

export const apiService = {
  // Get all demo sessions (job descriptions)
  getJobs: async () => {
    return safeApiCall(
      async () => {
        const response = await api.get('/job-descriptions/');
        return response.data;
      },
      // Fallback mock data
      // [
      //   {
      //     id: 1,
      //     title: "Software Engineering Jobs",
      //     description: "Practice coding and system design questions for software engineering roles"
      //   },
      //   {
      //     id: 2,
      //     title: "Product Manager Jobs",
      //     description: "Behavioral and product strategy questions for PM positions"
      //   },
      //   {
      //     id: 3,
      //     title: "Data Science Jobs",
      //     description: "Technical and analytical questions for data science roles"
      //   }
      // ]
    );
  },

  // Upload resume and get questions
  uploadResume: async (file, jobId) => {
    try {
      const formData = new FormData();
      formData.append('resume_image', file);
      formData.append('job_description_id', String(jobId)); // Ensure it's a string for FormData

      const response = await api.post('/upload-resume/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Check for error in response (backend returns {'error': 'message'} on errors)
      if (response.data && response.data.error) {
        throw new Error(response.data.error);
      }
      
      return response.data;
    } catch (error) {
      // Handle axios errors - backend returns {'error': 'message'} in response.data
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      // Re-throw with original message if it's already an Error
      if (error instanceof Error) {
        throw error;
      }
      // Otherwise wrap in Error
      throw new Error(error.message || 'Failed to upload resume');
    }
  },


  // Submit answer and get next question with evaluation
  submitAnswerAndGetNext: async (reportId, answer) => {
    const response = await api.post('/submit-answer-and-get-next/', {
      report_id: reportId,
      answer: answer,
    });
    return response.data;
  },

  // Get final feedback after all questions
  getFinalFeedback: async (reportId) => {
    const response = await api.post('/get-final-feedback/', {
      report_id: reportId,
    });
    return response.data;
  },

  // ==================== DSA Interview APIs ====================
  
  // Generate behavioral report after 5 questions
  generateBehavioralReport: async (reportId, recordedAudio) => {
    try {
      const formData = new FormData();
      formData.append('report_id', String(reportId));
      formData.append('recorded_audio', recordedAudio);

      const response = await api.post('/generate-behavioral-report/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error generating behavioral report:', error);
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  },

  // Get DSA question
  getDSAQuestion: async (reportId, role = 'general', difficulty = 'medium') => {
    const response = await api.post('/get-dsa-question/', {
      report_id: reportId,
      role: role,
      difficulty: difficulty,
    });
    return response.data;
  },

  // Submit pseudocode and start analysis
  submitPseudocode: async (reportId, pseudocode) => {
    const response = await api.post('/submit-pseudocode/', {
      report_id: reportId,
      pseudocode: pseudocode,
    });
    return response.data;
  },

  // Continue pseudocode conversation
  continuePseudocodeConversation: async (reportId, reply) => {
    const response = await api.post('/continue-pseudocode/', {
      report_id: reportId,
      reply: reply,
    });
    return response.data;
  },

  // Get combined final report (behavioral + DSA)
  getCombinedReport: async (reportId) => {
    const response = await api.post('/get-combined-report/', {
      report_id: reportId,
    });
    return response.data;
  },

  // ==================== Report Management APIs ====================
  
  // Get all reports for recruiter dashboard
  getAllReports: async () => {
    try {
      const response = await api.get('/reports/');
      return response.data.reports || [];
    } catch (error) {
      console.error('Error fetching reports:', error);
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  },

  // Get a specific report by ID
  getReportById: async (reportId) => {
    try {
      const response = await api.get(`/reports/${reportId}/`);
      return response.data.report;
    } catch (error) {
      console.error('Error fetching report:', error);
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  },

  // Create a new report
  createReport: async (reportData) => {
    try {
      const response = await api.post('/reports/create/', reportData);
      return response.data.report;
    } catch (error) {
      console.error('Error creating report:', error);
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  },

  // Get dashboard statistics
  getDashboardStatistics: async () => {
    try {
      const response = await api.get('/reports/statistics/');
      return response.data.statistics;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  },

  // Delete a report
  deleteReport: async (reportId) => {
    try {
      await api.delete(`/reports/${reportId}/delete/`);
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  },

  // Update report decision
  updateReportDecision: async (reportId, decision) => {
    try {
      const response = await api.patch(`/reports/${reportId}/decision/`, { decision });
      return response.data; // Return full response including email_sent and email_message
    } catch (error) {
      console.error('Error updating report decision:', error);
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  },

  // Search reports by candidate name
  searchReportsByCandidate: async (candidateName) => {
    try {
      const response = await api.get('/reports/');
      const allReports = response.data.reports || [];
      return allReports.filter(report => 
        report.candidate_name.toLowerCase().includes(candidateName.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching reports:', error);
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  },

  // Get reports by rating
  getReportsByRating: async (rating) => {
    try {
      const response = await api.get('/reports/');
      const allReports = response.data.reports || [];
      return allReports.filter(report => report.overall_rating === rating);
    } catch (error) {
      console.error('Error filtering reports by rating:', error);
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  },

  // Get recent reports (last N days)
  getRecentReports: async (days = 30) => {
    try {
      const response = await api.get('/reports/');
      const allReports = response.data.reports || [];
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return allReports.filter(report => {
        const reportDate = new Date(report.created_at);
        return reportDate >= cutoffDate;
      });
    } catch (error) {
      console.error('Error fetching recent reports:', error);
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  },
};

export default apiService;
