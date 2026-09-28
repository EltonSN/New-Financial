import React, { useId } from 'react';

// Chave de duas posições para campos com exatamente duas opções (ex.: Entrada/Saída).
// Um clique alterna. O botão desliza para o lado da opção ativa e o nome dela fica
// no lado oposto do trilho, como numa chave dia/noite. `opcoes` é uma dupla
// `[{ value, label, icon, tom }]` — `tom` escolhe a cor (`entrada`, `saida`) — e o
// `onChange` recebe `e.target.value`, como os outros campos do kit.
const Switch = ({ label, opcoes, value, onChange, name, className = '', disabled }) => {
  const id = useId();
  const [primeira, segunda] = opcoes;
  const naSegunda = String(value) === String(segunda.value);
  const atual = naSegunda ? segunda : primeira;
  const outra = naSegunda ? primeira : segunda;
  const Icone = atual.icon;

  const alternar = () => {
    if (disabled) return;
    onChange?.({ target: { value: outra.value, name } });
  };

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label className="dark-input-label" htmlFor={id}>
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={naSegunda}
        aria-label={label ? `${label}: ${atual.label}` : atual.label}
        title={`Mudar para ${outra.label}`}
        className={`chave chave--${atual.tom} ${naSegunda ? 'is-direita' : ''}`}
        onClick={alternar}
        disabled={disabled}
      >
        <span className="chave-texto" aria-hidden="true">{atual.label}</span>
        <span className="chave-botao" aria-hidden="true">
          {Icone && <Icone size={18} strokeWidth={2} />}
        </span>
      </button>
    </div>
  );
};

export default Switch;
