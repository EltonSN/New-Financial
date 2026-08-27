import React from 'react';
import { COLORS, TAG_PALETTE, TRANSITIONS } from '../../constants/theme';

// Seletor de cor: os swatches são a paleta do design system (TAG_PALETTE) e o
// input nativo cobre qualquer cor fora dela. Segue o mesmo contrato de props dos
// outros campos do kit (`label`, `value`, `onChange`).
const ColorInput = ({ label, value, onChange, className = '' }) => {
  const atual = value || COLORS.primary;

  return (
    <div className={`form-group ${className}`}>
      {label && <label className="dark-input-label">{label}</label>}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {TAG_PALETTE.map((cor) => {
          const selecionada = atual.toLowerCase() === cor.valor.toLowerCase();
          return (
            <button
              key={cor.valor}
              type="button"
              title={cor.nome}
              aria-label={cor.nome}
              aria-pressed={selecionada}
              onClick={() => onChange(cor.valor)}
              style={{
                width: '26px',
                height: '26px',
                padding: 0,
                borderRadius: '8px',
                background: cor.valor,
                border: selecionada
                  ? `2px solid ${COLORS.white}`
                  : `1px solid ${COLORS.borderLight}`,
                boxShadow: selecionada ? `0 0 0 3px ${cor.valor}55` : 'none',
                cursor: 'pointer',
                transition: TRANSITIONS.fast,
              }}
            />
          );
        })}

        <input
          type="color"
          value={atual}
          onChange={(e) => onChange(e.target.value)}
          title="Outra cor"
          aria-label="Escolher outra cor"
          style={{
            width: '38px',
            height: '26px',
            padding: 0,
            background: COLORS.inputBg,
            border: `1px solid ${COLORS.inputBorder}`,
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        />
      </div>
    </div>
  );
};

export default ColorInput;
