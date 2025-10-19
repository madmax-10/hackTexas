import axios from 'axios';

// Use environment variable if available, otherwise fallback to localhost
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
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
  // Get all demo sessions
  getDemos: async () => {
    return safeApiCall(
      async () => {
        const response = await api.get('/demos/');
        return response.data;
      },
      // Fallback mock data
      [
        {
          id: 1,
          title: "Software Engineering Jobs",
          description: "Practice coding and system design questions for software engineering roles"
        },
        {
          id: 2,
          title: "Product Manager Jobs",
          description: "Behavioral and product strategy questions for PM positions"
        },
        {
          id: 3,
          title: "Data Science Jobs",
          description: "Technical and analytical questions for data science roles"
        }
      ]
    );
  },

  // Upload resume and get questions
  uploadResume: async (file, demoId) => {
    const formData = new FormData();
    formData.append('resume_image', file);
    formData.append('demo_id', demoId);

    const response = await api.post('/upload-resume/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Convert text to speech using Eleven Labs
  textToSpeech: async (text) => {
    const response = await api.post('/text-to-speech/', {
      text: text,
    }, {
      responseType: 'blob', // Important for audio file
    });
    return response.data; // Returns audio blob
  },

  // Submit answer and get next question with evaluation
  submitAnswerAndGetNext: async (sessionId, answer) => {
    const response = await api.post('/submit-answer-and-get-next/', {
      session_id: sessionId,
      answer: answer,
    });
    return response.data;
  },

  // Get final feedback after all questions
  getFinalFeedback: async (sessionId) => {
    const response = await api.post('/get-final-feedback/', {
      session_id: sessionId,
    });
    return response.data;
  },

  // ==================== DSA Interview APIs ====================
  
  // Generate behavioral report after 5 questions
  generateBehavioralReport: async (sessionId) => {
    const response = await api.post('/generate-behavioral-report/', {
      session_id: sessionId,
    });
    return response.data;
  },

  // Get DSA question
  getDSAQuestion: async (sessionId, role = 'general', difficulty = 'medium') => {
    const response = await api.post('/get-dsa-question/', {
      session_id: sessionId,
      role: role,
      difficulty: difficulty,
    });
    return response.data;
  },

  // Submit pseudocode and start analysis
  submitPseudocode: async (sessionId, pseudocode) => {
    const response = await api.post('/submit-pseudocode/', {
      session_id: sessionId,
      pseudocode: pseudocode,
    });
    return response.data;
  },

  // Continue pseudocode conversation
  continuePseudocodeConversation: async (sessionId, reply) => {
    const response = await api.post('/continue-pseudocode/', {
      session_id: sessionId,
      reply: reply,
    });
    return response.data;
  },

  // Get combined final report (behavioral + DSA)
  getCombinedReport: async (sessionId) => {
    const response = await api.post('/get-combined-report/', {
      session_id: sessionId,
    });
    return response.data;
  },
};

export default apiService;
