import React from 'react';

const Button = ({ children, onClick, variant = 'primary', type = 'button', icon: Icon, className = '', ...props }) => {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
  }[variant] || 'btn-primary';

  return (
    <button
      type={type}
      onClick={onClick}
      className={`btn ${variantClass} ${className}`}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

export default Button;
