// Report API Service for interacting with backend database
// const API_BASE_URL = 'http://localhost:8000/api';
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'https://hackbackend-551n.onrender.com/api';


class ReportApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  // Helper method to handle API responses
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Get all reports for recruiter dashboard
  async getAllReports() {
    try {
      const response = await fetch(`${this.baseUrl}/reports/`);
      const data = await this.handleResponse(response);
      return data.reports || [];
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  }

  // Get a specific report by ID
  async getReportById(reportId) {
    try {
      const response = await fetch(`${this.baseUrl}/reports/${reportId}/`);
      const data = await this.handleResponse(response);
      return data.report;
    } catch (error) {
      console.error('Error fetching report:', error);
      throw error;
    }
  }

  // Create a new report
  async createReport(reportData) {
    try {
      const response = await fetch(`${this.baseUrl}/reports/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
      });
      const data = await this.handleResponse(response);
      return data.report;
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  }

  // Get dashboard statistics
  async getDashboardStatistics() {
    try {
      const response = await fetch(`${this.baseUrl}/reports/statistics/`);
      const data = await this.handleResponse(response);
      return data.statistics;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }

  // Delete a report
  async deleteReport(reportId) {
    try {
      const response = await fetch(`${this.baseUrl}/reports/${reportId}/delete/`, {
        method: 'DELETE'
      });
      await this.handleResponse(response);
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  }

  // Update report decision
  async updateReportDecision(reportId, decision) {
    try {
      const response = await fetch(`${this.baseUrl}/reports/${reportId}/decision/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision })
      });
      const data = await this.handleResponse(response);
      return data; // Return full response including email_sent and email_message
    } catch (error) {
      console.error('Error updating report decision:', error);
      throw error;
    }
  }

  // Search reports by candidate name
  async searchReportsByCandidate(candidateName) {
    try {
      const allReports = await this.getAllReports();
      return allReports.filter(report => 
        report.candidate_name.toLowerCase().includes(candidateName.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching reports:', error);
      throw error;
    }
  }

  // Get reports by rating
  async getReportsByRating(rating) {
    try {
      const allReports = await this.getAllReports();
      return allReports.filter(report => report.overall_rating === rating);
    } catch (error) {
      console.error('Error filtering reports by rating:', error);
      throw error;
    }
  }

  // Get recent reports (last N days)
  async getRecentReports(days = 30) {
    try {
      const allReports = await this.getAllReports();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      return allReports.filter(report => {
        const reportDate = new Date(report.created_at);
        return reportDate >= cutoffDate;
      });
    } catch (error) {
      console.error('Error fetching recent reports:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const reportApiService = new ReportApiService();
export default reportApiService;
