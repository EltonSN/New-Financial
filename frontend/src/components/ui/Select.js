import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import Popover from './Popover';

// Select próprio no lugar do <select> nativo: a lista aberta do nativo é desenhada
// pelo sistema operacional (fundo branco/azul) e não aceita estilo. Mantém o mesmo
// contrato de antes — `options`, `value`, `placeholder`, `required` e um `onChange`
// que recebe `e.target.value` — para as páginas não mudarem.
const Select = ({
  label,
  options,
  error,
  placeholder = 'Selecione…',
  className = '',
  id,
  value,
  onChange,
  name,
  required,
  disabled,
}) => {
  const autoId = useId();
  const selectId = id || autoId;
  const listaId = `${selectId}-lista`;
  const erroId = `${selectId}-erro`;
  const gatilhoRef = useRef(null);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);

  // A primeira opção é o placeholder, que limpa o campo — como no nativo.
  const itens = [{ value: '', label: placeholder, vazio: true }, ...options];
  const indiceAtual = itens.findIndex((o) => String(o.value) === String(value ?? ''));
  const selecionado = indiceAtual > 0 ? itens[indiceAtual] : null;

  const fechar = useCallback(() => setAberto(false), []);

  // A opção ativa acompanha o teclado dentro da lista rolável (sem rolar a página).
  useEffect(() => {
    if (!aberto || ativo < 0) return;
    const el = document.getElementById(`${listaId}-${ativo}`);
    const lista = el?.parentElement;
    if (!el || !lista) return;
    if (el.offsetTop < lista.scrollTop) lista.scrollTop = el.offsetTop;
    else if (el.offsetTop + el.offsetHeight > lista.scrollTop + lista.clientHeight) {
      lista.scrollTop = el.offsetTop + el.offsetHeight - lista.clientHeight;
    }
  }, [aberto, ativo, listaId]);

  const abrir = () => {
    if (disabled) return;
    setAtivo(indiceAtual >= 0 ? indiceAtual : 0);
    setAberto(true);
  };

  const escolher = (item) => {
    onChange?.({ target: { value: item.value, name } });
    setAberto(false);
    gatilhoRef.current?.focus();
  };

  const aoTeclar = (e) => {
    if (!aberto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    if (e.key === 'Escape' || e.key === 'Tab') {
      if (e.key === 'Escape') e.preventDefault();
      fechar();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAtivo((i) => Math.min(itens.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAtivo((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setAtivo(e.key === 'Home' ? 0 : itens.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (itens[ativo]) escolher(itens[ativo]);
    } else if (e.key.length === 1) {
      // Digitar uma letra pula para a próxima opção que começa com ela.
      const letra = e.key.toLowerCase();
      const proximo = itens.findIndex((o, i) => i > ativo && !o.vazio && String(o.label).toLowerCase().startsWith(letra));
      const primeiro = itens.findIndex((o) => !o.vazio && String(o.label).toLowerCase().startsWith(letra));
      const alvo = proximo >= 0 ? proximo : primeiro;
      if (alvo >= 0) setAtivo(alvo);
    }
  };

  return (
    <div className={`form-group campo-select ${className}`}>
      {label && (
        <label className="dark-input-label" htmlFor={selectId}>
          {label}
        </label>
      )}
      <div className="campo-select-ancora">
        <button
          ref={gatilhoRef}
          id={selectId}
          type="button"
          className={`dark-select ${aberto ? 'is-aberto' : ''}`}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={aberto}
          aria-controls={aberto ? listaId : undefined}
          aria-activedescendant={aberto && ativo >= 0 ? `${listaId}-${ativo}` : undefined}
          aria-label={!label ? placeholder : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? erroId : undefined}
          disabled={disabled}
          onClick={() => (aberto ? fechar() : abrir())}
          onKeyDown={aoTeclar}
        >
          <span className={`campo-select-valor ${selecionado ? '' : 'is-placeholder'}`}>
            {selecionado ? selecionado.label : placeholder}
          </span>
          <ChevronDown size={16} className="campo-select-seta" aria-hidden="true" />
        </button>
        {/* Mantém a validação nativa do formulário (`required`) num campo invisível. */}
        {required && (
          <input
            className="campo-validacao"
            tabIndex={-1}
            aria-hidden="true"
            required
            value={value ?? ''}
            onChange={() => {}}
            onFocus={() => gatilhoRef.current?.focus()}
          />
        )}
      </div>

      <Popover anchorRef={gatilhoRef} open={aberto} onClose={fechar}>
        <ul className="popover-lista" role="listbox" id={listaId} aria-label={label || placeholder}>
          {itens.map((item, i) => {
            const marcado = i === indiceAtual && !item.vazio;
            return (
              <li
                key={`${item.value}-${i}`}
                id={`${listaId}-${i}`}
                role="option"
                aria-selected={marcado}
                className={`popover-opcao ${i === ativo ? 'is-ativa' : ''} ${marcado ? 'is-marcada' : ''} ${item.vazio ? 'is-vazia' : ''}`}
                onMouseEnter={() => setAtivo(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(item)}
              >
                <span>{item.label}</span>
                {marcado && !item.vazio && <Check size={15} aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      </Popover>

      {error && (
        <span className="dark-input-error" id={erroId}>
          {error}
        </span>
      )}
    </div>
  );
};

export default Select;
