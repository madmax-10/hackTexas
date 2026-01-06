import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ message = 'Loading...', size = 40 }) => {
  return (
    <div className="loading-spinner-container">
      <div className="loading-spinner-content">
        <div className="loading-spinner-circle"></div>
        <p className="loading-spinner-message">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;

