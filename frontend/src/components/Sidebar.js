import React from 'react';
import { LayoutDashboard, ArrowRightLeft, CreditCard, Home, HandCoins, Settings } from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transações', icon: ArrowRightLeft },
  { id: 'cards', label: 'Cartões', icon: CreditCard },
  { id: 'house', label: 'Casa', icon: Home },
  { id: 'loans', label: 'Empréstimos', icon: HandCoins },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

const Sidebar = ({ currentPage, onNavigate }) => {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={process.env.PUBLIC_URL + '/logo.png'} alt="CoreFin Logo" />
          <span className="sidebar-logo-text">
            <span style={{ color: '#DAF1DE', fontWeight: 700 }}>Core</span>
            <span style={{ color: '#8EB69B', fontWeight: 400 }}>Fin</span>
          </span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`sidebar-nav-item ${currentPage === item.id ? 'active' : ''}`}
              >
                <Icon size={20} className="nav-icon" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          © 2026 CoreFin - v3.0.0
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav">
        <div className="mobile-bottom-nav-inner">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`mobile-nav-item ${currentPage === item.id ? 'active' : ''}`}
              >
                <Icon size={20} />
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
