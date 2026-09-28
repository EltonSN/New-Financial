// ==================== DESIGN SYSTEM — IDENTIDADE COREFIN ====================
// Fonte: CoreFin_Identidade/corefin-identidade.html. O layout vive no preto e em
// cinzas neutros; o vidro separa as camadas sem precisar de cor. O gradiente
// Profundo → Água aparece só onde há informação: no símbolo, no item ativo e nos
// gráficos. As mesmas cores existem como variáveis CSS em `index.css` (:root) para
// as classes globais de `App.css` — mudar uma cor aqui é mudar lá também.

// Cores da marca, usadas para montar o resto dos tokens.
export const BRAND = {
  navy: '#0D4671', // Profundo
  aqua: '#92E1E2', // Água
  gradient: 'linear-gradient(135deg, #0D4671, #92E1E2)',
  // Mesmo gradiente em vertical, para barras e trilhas de progresso.
  gradientVertical: 'linear-gradient(180deg, #92E1E2, #0D4671)',
};

export const COLORS = {
  // Backgrounds
  bgDeep: '#0A0A0B', // fundo
  bgPrimary: '#141416', // superfície (cards sólidos, inputs)
  bgSurface: 'rgba(20, 20, 22, 0.55)',
  bgSurfaceSolid: '#141416',
  bgHover: 'rgba(255, 255, 255, 0.04)',
  bgActiveNav: 'rgba(255, 255, 255, 0.08)',

  // Accent / Primary — Água
  primary: BRAND.aqua,
  primaryDark: BRAND.navy,
  primaryLight: 'rgba(6, 9, 10, 0.36)',
  primaryGlow: 'rgba(3, 3, 3, 0.62)',
  onPrimary: '#0A0A0B', // texto sobre fundo Água

  // Text
  text: '#F2F4F5',
  textSecondary: '#9BA1A6',
  textMuted: '#80868C', // ainda passa de 4.5:1 sobre a superfície
  textAccent: BRAND.aqua,

  // Status — tons 400, que mantêm contraste sobre o preto
  success: '#4ADE80',
  successBg: 'rgba(74, 222, 128, 0.12)',
  danger: '#F87171',
  dangerBg: 'rgba(248, 113, 113, 0.12)',
  dangerBorder: 'rgba(248, 113, 113, 0.35)',
  warning: '#FBBF24',
  warningBg: 'rgba(251, 191, 36, 0.12)',
  info: '#60A5FA',
  infoBg: 'rgba(96, 165, 250, 0.12)',
  violet: '#A78BFA',
  violetBg: 'rgba(167, 139, 250, 0.12)',
  // Dourado do Prevy (previsão de saldo) — destaque reservado a essa funcionalidade.
  gold: '#E3BC6E',

  // Borders
  borderSubtle: 'rgba(255, 255, 255, 0.04)',
  border: 'rgba(255, 255, 255, 0.07)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  borderAccent: 'rgba(146, 225, 226, 0.35)',

  // Inputs e itens aninhados dentro de um card de vidro
  inputBg: 'rgba(10, 10, 11, 0.4)',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  inputFocusBorder: 'rgba(146, 225, 226, 0.55)',
  inputFocusGlow: 'rgba(146, 225, 226, 0.15)',

  // Misc
  cardBg: 'rgba(20, 20, 22, 0.55)',
  overlay: 'rgba(5, 5, 6, 0.62)',
  white: '#ffffff',
};

// Séries de gráfico sem significado próprio (ex.: fatias por categoria). Começa
// pela marca e segue por tons distinguíveis entre si sobre o preto.
export const CHART_PALETTE = [
  BRAND.aqua,
  '#4F9FCB',
  COLORS.violet,
  COLORS.warning,
  '#F472B6',
  COLORS.success,
  COLORS.danger,
  '#2DD4BF',
];

// Vidro fosco da identidade: reflexo em gradiente por cima de um tom escuro
// translúcido, blur com saturação e um fio de luz nas bordas (box-shadow inset).
// GLASS é a placa principal (sidebar, cards); GLASS_LIGHT é a camada aninhada.
export const GLASS = {
  background:
    'linear-gradient(155deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 42%, rgba(255,255,255,0.01) 100%), rgba(20, 20, 22, 0.55)',
  backdropFilter: 'blur(24px) saturate(125%)',
  WebkitBackdropFilter: 'blur(24px) saturate(125%)',
  border: '1px solid rgba(255, 255, 255, 0.09)',
  borderRadius: '24px',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(255,255,255,0.05), 0 30px 60px -30px rgba(0,0,0,0.85)',
};

export const GLASS_LIGHT = {
  background: COLORS.inputBg,
  border: `1px solid ${COLORS.borderSubtle}`,
  borderRadius: '14px',
};

export const SHADOWS = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.35)',
  md: '0 12px 24px -10px rgba(0, 0, 0, 0.7)',
  lg: '0 40px 80px -30px rgba(0, 0, 0, 0.9)',
  glow: '0 0 20px rgba(146, 225, 226, 0.15)',
  glowStrong: '0 0 8px 1px rgba(146, 225, 226, 0.85), 0 0 22px 5px rgba(146, 225, 226, 0.28)',
};

// Propriedades listadas uma a uma: `transition: all` anima o que não devia
// (inclusive layout) e custa caro com backdrop-filter na tela.
const PROPS_TRANSICAO = ['background-color', 'border-color', 'box-shadow', 'color', 'opacity', 'transform'];
const transicao = (tempo, curva) => PROPS_TRANSICAO.map((p) => `${p} ${tempo} ${curva}`).join(', ');

export const TRANSITIONS = {
  fast: transicao('0.15s', 'ease'),
  normal: transicao('0.25s', 'ease'),
  slow: transicao('0.35s', 'cubic-bezier(0.4, 0, 0.2, 1)'),
};

export const FONT = {
  // Inter no corpo, nos formulários e na navegação.
  family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  // Manrope 700 com espaçamento levemente negativo nos títulos e valores em destaque.
  display: "'Manrope', 'Inter', system-ui, sans-serif",
  sizes: {
    xs: '11px',
    sm: '13px',
    base: '14px',
    md: '15px',
    lg: '18px',
    xl: '22px',
    xxl: '28px',
    hero: '36px',
  },
  weights: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
};

export const SIDEBAR = {
  width: '260px',
  collapsedWidth: '72px',
  gutter: '16px', // a sidebar flutua: distância até as bordas da janela
};

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
};
