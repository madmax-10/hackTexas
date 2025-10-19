import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import './App.css';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/loginpage';
import RecruiterDashboard from './pages/RecruiterDashboard';
import ResumeUpload from './pages/ResumeUpload';
import InterviewPage from './pages/InterviewPage';
import ReportPage from './pages/ReportPage';

function App() {
  const [sessionData, setSessionData] = useState(null);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
          <Route 
            path="/upload" 
            element={<ResumeUpload setSessionData={setSessionData} />} 
          />
          <Route 
            path="/interview" 
            element={<InterviewPage sessionData={sessionData} setSessionData={setSessionData} />} 
          />
          <Route 
            path="/report" 
            element={<ReportPage sessionData={sessionData} />} 
          />
          <Route 
            path="/report/:reportId" 
            element={<ReportPage sessionData={sessionData} />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;