import React, { useId } from 'react';
import { Pipette } from 'lucide-react';
import { COLORS } from '../../constants/theme';

// Seletor de cor de campo único: amostra + hex num campo afundado como os outros, e
// o seletor do sistema abre ao clicar em qualquer ponto dele. O <input type="color">
// fica por cima, transparente, para o clique e o teclado caírem direto nele. Mesmo
// contrato de antes: `label`, `value` (hex) e `onChange(hex)`.
const ColorInput = ({ label, value, onChange, className = '' }) => {
  const id = useId();
  const atual = value || COLORS.primary;

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label className="dark-input-label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="dark-input campo-cor">
        <span className="campo-cor-amostra" style={{ background: atual }} aria-hidden="true" />
        <span className="campo-cor-hex" translate="no">{atual.toUpperCase()}</span>
        <span className="campo-cor-acao" aria-hidden="true">
          <Pipette size={15} />
          <span>Escolher cor</span>
        </span>
        <input
          id={id}
          type="color"
          className="campo-cor-nativo"
          value={atual.slice(0, 7)}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label ? undefined : 'Escolher cor'}
        />
      </div>
    </div>
  );
};

export default ColorInput;
