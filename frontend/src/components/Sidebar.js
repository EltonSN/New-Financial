import React from 'react';
import { LayoutDashboard, ArrowRightLeft, CreditCard, Settings } from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transações', icon: ArrowRightLeft },
  { id: 'cards', label: 'Cartões', icon: CreditCard },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

const Sidebar = ({ currentPage, onNavigate }) => {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src={process.env.PUBLIC_URL + '/logo.png'} alt="FinanceControl Logo" />
          <span className="sidebar-logo-text">FinanceControl</span>
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
          © 2026 FinanceControl - v1.0.0
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
