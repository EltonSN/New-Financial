import React from 'react';
import { COLORS } from '../../constants/theme';

// #rgb, #rrggbb e #rrggbbaa -> {r, g, b}. Devolve null para qualquer coisa fora disso,
// e aí quem chama cai na cor padrão em vez de renderizar um estilo quebrado.
const parseHex = (hex) => {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6);
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

const rgba = (rgb, alpha) => `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;

// Luminância relativa (WCAG). Uma cor escura demais como texto sobre o fundo
// escuro fica ilegível, então a tag mantém só o fundo/borda tingidos e escreve
// no texto padrão.
const luminancia = ({ r, g, b }) => {
  const canal = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
};

const Tag = ({ color, children, title }) => {
  const rgb = parseHex(color) || parseHex(COLORS.primary);
  const legivel = luminancia(rgb) >= 0.12;

  return (
    <span
      title={title}
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '999px',
        background: rgba(rgb, 0.14),
        border: `1px solid ${rgba(rgb, 0.4)}`,
        color: legivel ? rgba(rgb, 1) : COLORS.text,
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.2px',
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  );
};

export default Tag;
