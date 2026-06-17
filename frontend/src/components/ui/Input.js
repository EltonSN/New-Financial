import React from 'react';

const Input = ({ label, error, className = '', ...props }) => (
  <div className={`form-group ${className}`}>
    {label && (
      <label className="dark-input-label">
        {label}
      </label>
    )}
    <input
      className="dark-input"
      {...props}
    />
    {error && (
      <span className="dark-input-error">
        {error}
      </span>
    )}
  </div>
);

export default Input;
