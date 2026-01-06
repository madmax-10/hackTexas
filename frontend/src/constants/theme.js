// Shared theme constants and styles

export const colors = {
  primary: '#d4af37',
  primaryDark: '#b8941f',
  background: '#1c1c1c',
  backgroundLight: '#2a2a2a',
  backgroundGradient: 'linear-gradient(135deg, #1c1c1c 0%, #2a2a2a 100%)',
  text: '#e0d5c5',
  textSecondary: '#9ca3af',
  textDark: '#374151',
  border: '#4b3832',
  borderLight: '#e5e7eb',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  goldGradient: 'linear-gradient(135deg, #d4af37 0%, #b8941f 100%)',
  brownGradient: 'linear-gradient(135deg, #4b3832 0%, #6b5b47 100%)',
};

export const buttonStyles = {
  primary: {
    background: colors.goldGradient,
    color: colors.background,
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 8px 25px rgba(212, 175, 55, 0.4), 0 4px 15px rgba(212, 175, 55, 0.3)',
    transform: 'perspective(1000px) translateZ(0)',
    transition: 'all 0.3s ease',
  },
  secondary: {
    background: 'transparent',
    color: colors.text,
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '16px',
    border: `2px solid ${colors.border}`,
    cursor: 'pointer',
    transform: 'perspective(1000px) translateZ(0)',
    boxShadow: '0 4px 15px rgba(75, 56, 50, 0.2)',
    transition: 'all 0.3s ease',
  },
};

export const containerStyles = {
  main: {
    minHeight: '100vh',
    background: colors.backgroundGradient,
    fontFamily: 'Playfair Display, serif',
    color: colors.text,
    lineHeight: '1.6',
    transform: 'perspective(1000px)',
    boxShadow: '0 0 50px rgba(0, 0, 0, 0.5)',
  },
  card: {
    backgroundColor: colors.backgroundLight,
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.4), 0 8px 20px rgba(0, 0, 0, 0.3)',
    border: `1px solid ${colors.border}`,
    marginBottom: '24px',
    transform: 'perspective(1000px) translateZ(10px)',
    transition: 'all 0.3s ease',
  },
};

export const navStyles = {
  main: {
    background: 'rgba(30, 30, 30, 0.9)',
    backdropFilter: 'blur(12px)',
    borderBottom: `1px solid ${colors.border}`,
    position: 'sticky',
    top: '0',
    zIndex: '50',
    transform: 'perspective(1000px) rotateX(0deg)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
};

