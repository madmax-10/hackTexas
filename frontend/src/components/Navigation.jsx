import React from 'react';
import { useNavigate } from 'react-router-dom';
import { colors } from '../constants/theme';
import './Navigation.css';

const Navigation = ({ activeSection, onNavClick }) => {
  const navigate = useNavigate();

  const handleNav = (section) => {
    if (onNavClick) {
      onNavClick(section);
    } else {
      navigate(`/?section=${section}`);
    }
  };

  return (
    <nav className="nav-main">
      <div className="nav-container">
        <div className="nav-content">
          <div className="nav-brand" onClick={() => handleNav('home')}>
            <div className="nav-logo">M</div>
            <span className="nav-title">
              Mock Me? <span className="nav-title-subtitle">Yes Please</span>
            </span>
          </div>
          
          <div className="nav-links">
            <button 
              onClick={() => handleNav('about')}
              className={`nav-link ${activeSection === 'about' ? 'nav-link-active' : ''}`}
            >
              About
            </button>
            <button 
              onClick={() => handleNav('programs')}
              className={`nav-link ${activeSection === 'programs' ? 'nav-link-active' : ''}`}
            >
              {activeSection === 'programs' ? 'Practice' : 'Jobs'}
            </button>
            <button 
              onClick={() => handleNav('resources')}
              className={`nav-link ${activeSection === 'resources' ? 'nav-link-active' : ''}`}
            >
              Resources
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="nav-link-button"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

