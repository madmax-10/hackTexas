import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './loginpage.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('user'); // 'user' | 'recruiter'
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recruiterCode, setRecruiterCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    // Simple client-side validation for MVP
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password.');
      return;
    }
    if (role === 'recruiter' && recruiterCode.trim().length === 0) {
      setError('Please enter your recruiter code.');
      return;
    }
    // Persist selected role for later use
    localStorage.setItem('authRole', role);
    localStorage.setItem('authEmail', email.trim());
    // Navigate to a sensible start page based on role (MVP)
    if (role === 'recruiter') {
      navigate('/recruiter-dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-title">
            Mock Me? <span className="login-brand-subtitle-text">Yes Please</span>
          </div>
          <div className="login-brand-subtitle">
            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
          </div>
        </div>

        {/* Mode + Role switch */}
        <div className="login-mode-switch">
          <button 
            onClick={() => setMode('login')} 
            className={mode === 'login' ? 'login-mode-button-active' : 'login-mode-button-inactive'}
          >
            Login
          </button>
          <button 
            onClick={() => setMode('signup')} 
            className={mode === 'signup' ? 'login-mode-button-active' : 'login-mode-button-inactive'}
          >
            Sign up
          </button>
        </div>
        
        <div className="login-role-switch">
          <button
            onClick={() => setRole('user')}
            className={role === 'user' ? 'login-role-button-active' : 'login-role-button-inactive'}
          >
            User Login
          </button>
          <button
            onClick={() => setRole('recruiter')}
            className={role === 'recruiter' ? 'login-role-button-active' : 'login-role-button-inactive'}
          >
            Recruiter Login
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <label className="login-label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="login-input"
          />

          <label className="login-label">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="login-input"
          />

          {role === 'recruiter' && (
            <>
              <label className="login-label">Recruiter Code</label>
              <input
                type="text"
                value={recruiterCode}
                onChange={(e) => setRecruiterCode(e.target.value)}
                placeholder="Enter your recruiter code"
                className="login-input"
              />
            </>
          )}

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button type="submit" className="login-submit-button">
            {mode === 'login' ? 'Continue' : 'Create account'}
          </button>
          
          <div className="login-divider">or</div>
          
          <button 
            type="button" 
            onClick={() => window.location.href=(import.meta.env?.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/auth/google/start` : '/login')} 
            className="login-google-button"
          >
            Continue with Google
          </button>
        </form>

        <div className="login-footer">
          By continuing you agree to our terms.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;