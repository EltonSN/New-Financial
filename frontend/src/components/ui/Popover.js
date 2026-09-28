import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Painel flutuante ancorado num campo (lista do Select, calendário do Input de data).
// Vai para o <body> por portal: cada glass-card cria o próprio contexto de
// empilhamento (backdrop-filter), então um painel absoluto dentro dele ficava por
// baixo do card seguinte. Posição fixa, recalculada em scroll/resize; abre para cima
// quando não cabe embaixo.
const MARGEM = 6;

const Popover = ({ anchorRef, open, onClose, children, minWidth, className = '', ...props }) => {
  const painelRef = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return undefined;
    }
    const posicionar = () => {
      const ancora = anchorRef.current;
      const painel = painelRef.current;
      if (!ancora || !painel) return;
      const r = ancora.getBoundingClientRect();
      const altura = painel.offsetHeight;
      const largura = Math.max(r.width, minWidth || 0);
      const cabeEmbaixo = r.bottom + MARGEM + altura <= window.innerHeight - 8;
      const top = cabeEmbaixo || r.top - MARGEM - altura < 8 ? r.bottom + MARGEM : r.top - MARGEM - altura;
      const left = Math.min(Math.max(8, r.left), window.innerWidth - largura - 8);
      setPos({ top, left, width: largura });
    };
    posicionar();
    window.addEventListener('resize', posicionar);
    window.addEventListener('scroll', posicionar, true);
    return () => {
      window.removeEventListener('resize', posicionar);
      window.removeEventListener('scroll', posicionar, true);
    };
  }, [open, anchorRef, minWidth]);

  // Fecha ao clicar fora do campo e do painel.
  useEffect(() => {
    if (!open) return undefined;
    const aoClicar = (e) => {
      if (painelRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', aoClicar);
    return () => document.removeEventListener('mousedown', aoClicar);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={painelRef}
      className={`popover-painel ${className}`}
      style={{
        position: 'fixed',
        top: pos ? pos.top : -9999,
        left: pos ? pos.left : -9999,
        width: pos ? pos.width : undefined,
        visibility: pos ? 'visible' : 'hidden',
      }}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
};

export default Popover;
