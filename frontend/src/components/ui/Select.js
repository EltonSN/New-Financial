import React from 'react';

const Select = ({ label, options, error, placeholder = "Selecione...", className = '', ...props }) => (
  <div className={`form-group ${className}`}>
    {label && (
      <label className="dark-input-label">
        {label}
      </label>
    )}
    <select
      className="dark-select"
      {...props}
    >
      <option value="">{placeholder}</option>
      {options.map((opt, idx) => (
        <option key={idx} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && (
      <span className="dark-input-error">
        {error}
      </span>
    )}
  </div>
);

export default Select;
