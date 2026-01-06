import React from 'react';
import './Button.css';

const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  disabled = false,
  className = '',
  ...props 
}) => {
  const buttonClass = variant === 'primary' 
    ? 'button-base button-primary' 
    : 'button-base button-secondary';
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${buttonClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

