// ==================== DESIGN SYSTEM — DARK PREMIUM ====================

export const COLORS = {
  // Backgrounds
  bgDeep: '#00e746ff',
  bgPrimary: '#d91010ff',
  bgSurface: 'rgba(15, 23, 42, 0.65)',
  bgSurfaceSolid: '#131b2e',
  bgHover: 'rgba(6, 182, 212, 0.08)',
  bgActiveNav: 'rgba(6, 182, 212, 0.12)',

  // Accent / Primary
  primary: '#06b6d4',
  primaryDark: '#0891b2',
  primaryLight: 'rgba(6, 182, 212, 0.15)',
  primaryGlow: 'rgba(6, 182, 212, 0.25)',

  // Text
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textAccent: '#06b6d4',

  // Status
  success: '#22c55e',
  successBg: 'rgba(34, 197, 94, 0.12)',
  danger: '#ef4444',
  dangerBg: 'rgba(239, 68, 68, 0.12)',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  info: '#3b82f6',
  infoBg: 'rgba(59, 130, 246, 0.12)',

  // Borders
  border: 'rgba(255, 255, 255, 0.06)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  borderAccent: 'rgba(6, 182, 212, 0.3)',

  // Inputs
  inputBg: 'rgba(15, 23, 42, 0.5)',
  inputBorder: 'rgba(255, 255, 255, 0.1)',
  inputFocusBorder: 'rgba(6, 182, 212, 0.6)',
  inputFocusGlow: 'rgba(6, 182, 212, 0.15)',

  // Misc
  cardBg: 'rgba(15, 23, 42, 0.6)',
  overlay: 'rgba(0, 0, 0, 0.5)',
  white: '#ffffff',
};

// Paleta de identidade — cores atribuíveis a uma entidade (hoje `cards.cor`).
// É daqui que a tela de Configurações monta os swatches: cor de cartão é decisão
// de design, então mora no design system e não em hex solto na página (ADR-0005).
// Todas escolhidas para manter contraste sobre o fundo escuro.
export const TAG_PALETTE = [
  { nome: 'Ciano', valor: COLORS.primary },
  { nome: 'Verde', valor: COLORS.success },
  { nome: 'Azul', valor: COLORS.info },
  { nome: 'Âmbar', valor: COLORS.warning },
  { nome: 'Vermelho', valor: COLORS.danger },
  { nome: 'Roxo', valor: '#a855f7' },
  { nome: 'Rosa', valor: '#ec4899' },
  { nome: 'Lima', valor: '#84cc16' },
  { nome: 'Laranja', valor: '#f97316' },
  { nome: 'Cinza', valor: COLORS.textSecondary },
];

export const GLASS = {
  background: 'rgba(15, 23, 42, 0.6)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid rgba(255, 255, 255, 0.08)`,
  borderRadius: '16px',
};

export const GLASS_LIGHT = {
  background: 'rgba(15, 23, 42, 0.4)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid rgba(255, 255, 255, 0.06)`,
  borderRadius: '12px',
};

export const SHADOWS = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
  md: '0 4px 16px rgba(0, 0, 0, 0.4)',
  lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
  glow: '0 0 20px rgba(6, 182, 212, 0.15)',
  glowStrong: '0 0 30px rgba(6, 182, 212, 0.25)',
};

export const TRANSITIONS = {
  fast: 'all 0.15s ease',
  normal: 'all 0.25s ease',
  slow: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
};

export const FONT = {
  family: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
};

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
};
