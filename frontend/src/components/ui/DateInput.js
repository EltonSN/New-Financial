import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import Popover from './Popover';

// Campo de data próprio no lugar do <input type="date">: o calendário nativo é
// desenhado pelo navegador e não segue a identidade. O valor continua sendo
// 'AAAA-MM-DD' e o `onChange` recebe `e.target.value`, como no nativo. Dá para
// digitar (máscara dd/mm/aaaa) ou escolher no calendário.
// Nomes de mês e dia da semana vêm do Intl, não de lista escrita à mão.
const LOCALE = 'pt-BR';
const nomesMes = (month) => Array.from({ length: 12 }, (_, m) =>
  new Intl.DateTimeFormat(LOCALE, { month }).format(new Date(2026, m, 1)).replace('.', ''));
const MESES = nomesMes('long');
const MESES_CURTOS = nomesMes('short');
// 04/01/2026 é um domingo: daí sai a semana começando no domingo.
const DIAS_SEMANA = Array.from({ length: 7 }, (_, i) =>
  new Intl.DateTimeFormat(LOCALE, { weekday: 'narrow' }).format(new Date(2026, 0, 4 + i)).toUpperCase());
const maiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const FORMATO_EXTENSO = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });

const pad = (n) => String(n).padStart(2, '0');
const paraIso = (a, m, d) => `${a}-${pad(m + 1)}-${pad(d)}`;
const lerIso = (iso) => {
  const [a, m, d] = String(iso || '').split('T')[0].split('-').map(Number);
  return a && m && d ? { a, m: m - 1, d } : null;
};
const isoParaTexto = (iso) => {
  const p = lerIso(iso);
  return p ? `${pad(p.d)}/${pad(p.m + 1)}/${p.a}` : '';
};
const hojeIso = () => {
  const h = new Date();
  return paraIso(h.getFullYear(), h.getMonth(), h.getDate());
};
const diasNoMes = (a, m) => new Date(a, m + 1, 0).getDate();

// dd/mm/aaaa digitado -> ISO, só quando é uma data que existe.
const textoParaIso = (txt) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(txt);
  if (!m) return null;
  const d = Number(m[1]);
  const mes = Number(m[2]) - 1;
  const a = Number(m[3]);
  if (mes < 0 || mes > 11 || d < 1 || d > diasNoMes(a, mes)) return null;
  return paraIso(a, mes, d);
};

const mascarar = (txt) => {
  const dig = txt.replace(/\D/g, '').slice(0, 8);
  if (dig.length <= 2) return dig;
  if (dig.length <= 4) return `${dig.slice(0, 2)}/${dig.slice(2)}`;
  return `${dig.slice(0, 2)}/${dig.slice(2, 4)}/${dig.slice(4)}`;
};

const DateInput = ({ id, value, onChange, name, required, disabled, placeholder, ...props }) => {
  const campoRef = useRef(null);
  const ancoraRef = useRef(null);
  const [texto, setTexto] = useState(isoParaTexto(value));
  const [aberto, setAberto] = useState(false);
  const [vista, setVista] = useState('dias'); // 'dias' | 'meses'
  const [cursor, setCursor] = useState(() => lerIso(value) || lerIso(hojeIso()));

  // Valor trocado de fora (editar um registro, limpar o formulário).
  useEffect(() => {
    setTexto(isoParaTexto(value));
  }, [value]);

  const emitir = (iso) => onChange?.({ target: { value: iso, name } });

  const fechar = useCallback(() => setAberto(false), []);

  const abrir = () => {
    if (disabled) return;
    setCursor(lerIso(value) || lerIso(hojeIso()));
    setVista('dias');
    setAberto(true);
  };

  const escolher = (iso) => {
    emitir(iso);
    setAberto(false);
    campoRef.current?.focus();
  };

  const aoDigitar = (e) => {
    const t = mascarar(e.target.value);
    setTexto(t);
    const iso = textoParaIso(t);
    if (iso) {
      emitir(iso);
      setCursor(lerIso(iso));
    } else if (t === '') {
      emitir('');
    }
  };

  // Ao sair do campo com uma data incompleta, volta para o último valor válido.
  const aoSair = () => {
    if (texto && !textoParaIso(texto)) setTexto(isoParaTexto(value));
  };

  const moverMes = (delta) => {
    setCursor((c) => {
      const data = new Date(c.a, c.m + delta, 1);
      return { a: data.getFullYear(), m: data.getMonth(), d: Math.min(c.d, diasNoMes(data.getFullYear(), data.getMonth())) };
    });
  };

  const moverDia = (delta) => {
    setCursor((c) => {
      const data = new Date(c.a, c.m, c.d + delta);
      return { a: data.getFullYear(), m: data.getMonth(), d: data.getDate() };
    });
  };

  const aoTeclarCalendario = (e) => {
    const mapa = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (vista === 'dias' && mapa[e.key] !== undefined) {
      e.preventDefault();
      moverDia(mapa[e.key]);
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      moverMes(e.key === 'PageUp' ? -1 : 1);
    } else if (e.key === 'Enter' && vista === 'dias') {
      e.preventDefault();
      escolher(paraIso(cursor.a, cursor.m, cursor.d));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      fechar();
      campoRef.current?.focus();
    }
  };

  // Com o calendário aberto, as setas/PageUp/PageDown/Enter/Esc do campo navegam nele;
  // Alt+↓ abre.
  const aoTeclarCampo = (e) => {
    if (!aberto) {
      if (e.key === 'ArrowDown' && e.altKey) {
        e.preventDefault();
        abrir();
      }
      return;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Enter', 'Escape'].includes(e.key)) {
      aoTeclarCalendario(e);
    }
  };

  // Grade do mês: começa no domingo da semana do dia 1 e fecha 6 semanas.
  const selecionada = value ? String(value).split('T')[0] : '';
  const hoje = hojeIso();
  const primeiroDiaSemana = new Date(cursor.a, cursor.m, 1).getDay();
  const celulas = Array.from({ length: 42 }, (_, i) => {
    const data = new Date(cursor.a, cursor.m, 1 - primeiroDiaSemana + i);
    return { a: data.getFullYear(), m: data.getMonth(), d: data.getDate() };
  });

  return (
    <div className="campo-data" ref={ancoraRef}>
      <input
        ref={campoRef}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        className="dark-input campo-data-texto"
        placeholder={placeholder || 'dd/mm/aaaa'}
        value={texto}
        onChange={aoDigitar}
        onBlur={aoSair}
        onKeyDown={aoTeclarCampo}
        required={required}
        disabled={disabled}
        pattern="\d{2}/\d{2}/\d{4}"
        title="Data no formato dd/mm/aaaa"
        {...props}
      />
      <button
        type="button"
        className="campo-data-botao"
        onClick={() => (aberto ? fechar() : abrir())}
        aria-label="Abrir calendário"
        aria-expanded={aberto}
        disabled={disabled}
        tabIndex={-1}
      >
        <CalendarDays size={17} aria-hidden="true" />
      </button>

      <Popover
        anchorRef={ancoraRef}
        open={aberto}
        onClose={fechar}
        minWidth={296}
        className="calendario"
        role="dialog"
        aria-label="Escolher data"
      >
        <div className="calendario-topo">
          <button
            type="button"
            className="calendario-titulo"
            onClick={() => setVista((v) => (v === 'dias' ? 'meses' : 'dias'))}
            aria-label={vista === 'dias' ? 'Escolher mês e ano' : 'Voltar aos dias'}
            aria-live="polite"
          >
            {vista === 'dias' ? `${maiuscula(MESES[cursor.m])} de ${cursor.a}` : cursor.a}
          </button>
          <div className="calendario-setas">
            <button
              type="button"
              className="calendario-seta"
              onClick={() => (vista === 'dias' ? moverMes(-1) : setCursor((c) => ({ ...c, a: c.a - 1 })))}
              aria-label={vista === 'dias' ? 'Mês anterior' : 'Ano anterior'}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="calendario-seta"
              onClick={() => (vista === 'dias' ? moverMes(1) : setCursor((c) => ({ ...c, a: c.a + 1 })))}
              aria-label={vista === 'dias' ? 'Próximo mês' : 'Próximo ano'}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {vista === 'dias' ? (
          <div className="calendario-grade">
            {DIAS_SEMANA.map((d, i) => (
              <span key={`sem-${i}`} className="calendario-semana" aria-hidden="true">{d}</span>
            ))}
            {celulas.map((c) => {
              const iso = paraIso(c.a, c.m, c.d);
              const foraDoMes = c.m !== cursor.m;
              const foco = c.a === cursor.a && c.m === cursor.m && c.d === cursor.d;
              return (
                <button
                  key={iso}
                  type="button"
                  className={[
                    'calendario-dia',
                    foraDoMes && 'is-fora',
                    iso === hoje && 'is-hoje',
                    iso === selecionada && 'is-selecionado',
                    foco && 'is-foco',
                  ].filter(Boolean).join(' ')}
                  onClick={() => escolher(iso)}
                  aria-label={FORMATO_EXTENSO.format(new Date(c.a, c.m, c.d))}
                  aria-pressed={iso === selecionada}
                  tabIndex={-1}
                >
                  {c.d}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="calendario-meses">
            {MESES_CURTOS.map((m, i) => (
              <button
                key={m}
                type="button"
                className={`calendario-mes ${i === cursor.m ? 'is-selecionado' : ''}`}
                onClick={() => {
                  setCursor((c) => ({ a: c.a, m: i, d: Math.min(c.d, diasNoMes(c.a, i)) }));
                  setVista('dias');
                }}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        <div className="calendario-rodape">
          <button type="button" className="calendario-link" onClick={() => escolher('')}>
            Limpar
          </button>
          <button type="button" className="calendario-link" onClick={() => escolher(hoje)}>
            Hoje
          </button>
        </div>
      </Popover>
    </div>
  );
};

export default DateInput;
