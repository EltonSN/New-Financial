import React, { useId } from 'react';
import DateInput from './DateInput';

// O id gerado liga o <label> ao campo: clicar no rótulo foca o input e o leitor
// de tela anuncia o nome certo. Sem rótulo visível, o placeholder vira aria-label.
// `type="date"` usa o DateInput (calendário da identidade) no lugar do nativo.
const Input = ({ label, error, className = '', id, type, ...props }) => {
  const autoId = useId();
  const inputId = id || autoId;
  const erroId = `${inputId}-erro`;

  const comuns = {
    id: inputId,
    'aria-label': !label ? props.placeholder : undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? erroId : undefined,
  };

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label className="dark-input-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      {type === 'date' ? (
        <DateInput {...comuns} {...props} />
      ) : (
        <input className="dark-input" type={type} autoComplete="off" {...comuns} {...props} />
      )}
      {error && (
        <span className="dark-input-error" id={erroId}>
          {error}
        </span>
      )}
    </div>
  );
};

export default Input;
