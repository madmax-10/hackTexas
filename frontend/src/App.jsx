import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { SessionProvider } from './contexts/SessionContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/loginpage';
import RecruiterDashboard from './pages/RecruiterDashboard';
import ResumeUpload from './pages/ResumeUpload';
import InterviewPage from './pages/InterviewPage';
import ReportPage from './pages/ReportPage';

function App() {
  return (
    <SessionProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/recruiter-dashboard" element={<RecruiterDashboard />} />
            <Route path="/upload" element={<ResumeUpload />} />
            <Route path="/interview" element={<InterviewPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/report/:reportId" element={<ReportPage />} />
          </Routes>
        </div>
      </Router>
    </SessionProvider>
  );
}

export default App;