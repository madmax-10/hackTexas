import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1c1c1c 0%, #2a2a2a 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px',
    fontFamily: 'Playfair Display, serif'
  };

  const cardStyle = {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: '#2a2a2a',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4), 0 10px 30px rgba(0, 0, 0, 0.3)',
    border: '1px solid #4b3832',
    transform: 'perspective(1000px) translateZ(20px)',
    transition: 'all 0.3s ease'
  };

  const buttonStyle = {
    background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
    color: '#1c1c1c',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 8px 25px rgba(212, 175, 55, 0.4), 0 4px 15px rgba(212, 175, 55, 0.3)',
    transform: 'perspective(1000px) translateZ(0)',
    transition: 'all 0.3s ease'
  };

  const secondaryButtonStyle = {
    background: 'transparent',
    color: '#e0d5c5',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
    border: '2px solid #4b3832',
    cursor: 'pointer',
    transform: 'perspective(1000px) translateZ(0)',
    boxShadow: '0 4px 15px rgba(75, 56, 50, 0.2)',
    transition: 'all 0.3s ease'
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: '#1c1c1c',
    color: '#e0d5c5',
    border: '2px solid #4b3832',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '16px',
    outline: 'none',
    transform: 'perspective(1000px) translateZ(0)',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.3s ease'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Brand */}
        <div style={{textAlign: 'center', marginBottom: '24px'}}>
          <div style={{
            fontSize: '34px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '8px'
          }}>
            Mock Me?!
          </div>
          <div style={{color: '#e0d5c5', fontSize: '16px'}}>
            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
          </div>
        </div>

        {/* Mode + Role switch */}
        <div style={{display: 'flex', gap: '8px', marginBottom: '16px', justifyContent: 'center'}}>
          <button 
            onClick={() => setMode('login')} 
            style={{
              ...(mode === 'login' ? buttonStyle : secondaryButtonStyle),
              padding: '8px 16px',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              if (mode !== 'login') {
                e.target.style.borderColor = '#d4af37';
                e.target.style.color = '#d4af37';
                e.target.style.transform = 'perspective(1000px) translateY(-3px) translateZ(5px) rotateX(3deg)';
                e.target.style.boxShadow = '0 8px 20px rgba(212, 175, 55, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'login') {
                e.target.style.borderColor = '#4b3832';
                e.target.style.color = '#e0d5c5';
                e.target.style.transform = 'perspective(1000px) translateZ(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(75, 56, 50, 0.2)';
              }
            }}
          >
            Login
          </button>
          <button 
            onClick={() => setMode('signup')} 
            style={{
              ...(mode === 'signup' ? buttonStyle : secondaryButtonStyle),
              padding: '8px 16px',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              if (mode !== 'signup') {
                e.target.style.borderColor = '#d4af37';
                e.target.style.color = '#d4af37';
                e.target.style.transform = 'perspective(1000px) translateY(-3px) translateZ(5px) rotateX(3deg)';
                e.target.style.boxShadow = '0 8px 20px rgba(212, 175, 55, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (mode !== 'signup') {
                e.target.style.borderColor = '#4b3832';
                e.target.style.color = '#e0d5c5';
                e.target.style.transform = 'perspective(1000px) translateZ(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(75, 56, 50, 0.2)';
              }
            }}
          >
            Sign up
          </button>
        </div>
        
        <div style={{display: 'flex', gap: '8px', marginBottom: '20px'}}>
          <button
            onClick={() => setRole('user')}
            style={{
              flex: 1,
              ...(role === 'user' ? buttonStyle : secondaryButtonStyle),
              padding: '10px 16px',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              if (role !== 'user') {
                e.target.style.borderColor = '#d4af37';
                e.target.style.color = '#d4af37';
              }
            }}
            onMouseLeave={(e) => {
              if (role !== 'user') {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.color = '#374151';
              }
            }}
          >
            User Login
          </button>
          <button
            onClick={() => setRole('recruiter')}
            style={{
              flex: 1,
              ...(role === 'recruiter' ? buttonStyle : secondaryButtonStyle),
              padding: '10px 16px',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => {
              if (role !== 'recruiter') {
                e.target.style.borderColor = '#d4af37';
                e.target.style.color = '#d4af37';
              }
            }}
            onMouseLeave={(e) => {
              if (role !== 'recruiter') {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.color = '#374151';
              }
            }}
          >
            Recruiter Login
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <label style={{display: 'block', color: '#374151', marginBottom: '8px', fontWeight: '500'}}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = '#d4af37';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = 'none';
            }}
          />

          <label style={{display: 'block', color: '#374151', marginBottom: '8px', fontWeight: '500', marginTop: '16px'}}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = '#d4af37';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = 'none';
            }}
          />

          {role === 'recruiter' && (
            <>
              <label style={{display: 'block', color: '#374151', marginBottom: '8px', fontWeight: '500', marginTop: '16px'}}>Recruiter Code</label>
              <input
                type="text"
                value={recruiterCode}
                onChange={(e) => setRecruiterCode(e.target.value)}
                placeholder="Enter your recruiter code"
                style={inputStyle}
                onFocus={(e) => {
                  e.target.style.borderColor = '#d4af37';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </>
          )}

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fca5a5',
              color: '#dc2626',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            style={{
              ...buttonStyle,
              width: '100%',
              fontSize: '16px',
              padding: '14px',
              marginTop: '24px'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)';
            }}
          >
            {mode === 'login' ? 'Continue' : 'Create account'}
          </button>
          
          <div style={{textAlign: 'center', color: '#9ca3af', fontSize: '14px', marginTop: '16px'}}>or</div>
          
          <button 
            type="button" 
            onClick={() => window.location.href=(import.meta.env?.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/auth/google/start` : '/login')} 
            style={{
              ...secondaryButtonStyle,
              width: '100%',
              fontSize: '16px',
              padding: '14px',
              marginTop: '12px'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#d4af37';
              e.target.style.color = '#d4af37';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.color = '#374151';
            }}
          >
            Continue with Google
          </button>
        </form>

        <div style={{textAlign: 'center', color: '#9ca3af', fontSize: '12px', marginTop: '16px'}}>
          By continuing you agree to our terms.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;