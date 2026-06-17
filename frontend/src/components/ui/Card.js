import React from 'react';

const Card = ({ children, title, subtitle, className = '' }) => (
  <div className={`glass-card animate-fade-in ${className}`}>
    {title && (
      <div style={{ marginBottom: '20px' }}>
        <h2 className="glass-card-title">
          {title}
        </h2>
        {subtitle && (
          <p className="glass-card-subtitle">
            {subtitle}
          </p>
        )}
      </div>
    )}
    {children}
  </div>
);

export default Card;
