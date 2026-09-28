import React from 'react';
import { LayoutDashboard, ArrowRightLeft, CreditCard, House, HandCoins, Cog } from 'lucide-react';

// Ícones no traço fino da identidade (stroke 1.6), os mesmos da prancha "Na interface".
const ICON_STROKE = 1.6;

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transações', icon: ArrowRightLeft },
  { id: 'cards', label: 'Cartões', icon: CreditCard },
  { id: 'house', label: 'Casa', icon: House },
  { id: 'loans', label: 'Empréstimos', icon: HandCoins },
  { id: 'settings', label: 'Configurações', icon: Cog },
];

const Sidebar = ({ currentPage, onNavigate }) => {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img
            src={process.env.PUBLIC_URL + '/brand/corefin-logo-dark.svg'}
            alt="CoreFin"
            width="108"
            height="28"
          />
        </div>

        <nav className="sidebar-nav" aria-label="Navegação principal">
          {navItems.map(item => {
            const Icon = item.icon;
            const ativo = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`sidebar-nav-item ${ativo ? 'active' : ''}`}
                aria-current={ativo ? 'page' : undefined}
              >
                <Icon size={21} strokeWidth={ICON_STROKE} className="nav-icon" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          © 2026 CoreFin · v4.0.0
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav" aria-label="Navegação principal">
        <div className="mobile-bottom-nav-inner">
          {navItems.map(item => {
            const Icon = item.icon;
            const ativo = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`mobile-nav-item ${ativo ? 'active' : ''}`}
                aria-current={ativo ? 'page' : undefined}
                title={item.label}
              >
                <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
