import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  BarChart3,
  ArrowRightLeft,
  CreditCard,
  Target,
} from 'lucide-react';

const DashboardPage = () => {
  const statCards = [
    {
      label: 'Saldo Geral',
      value: '—',
      icon: Wallet,
      color: '#06b6d4',
      bg: 'rgba(6, 182, 212, 0.12)',
    },
    {
      label: 'Entradas do Mês',
      value: '—',
      icon: TrendingUp,
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.12)',
    },
    {
      label: 'Saídas do Mês',
      value: '—',
      icon: TrendingDown,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
    },
    {
      label: 'Investimentos',
      value: '—',
      icon: Target,
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.12)',
    },
  ];

  const widgets = [
    {
      title: 'Entradas vs Saídas',
      description: 'Gráfico comparativo mensal será exibido aqui',
      icon: BarChart3,
    },
    {
      title: 'Gastos por Categoria',
      description: 'Distribuição de gastos por categoria',
      icon: PieChart,
    },
    {
      title: 'Últimas Transações',
      description: 'Lista das transações mais recentes',
      icon: ArrowRightLeft,
    },
    {
      title: 'Resumo dos Cartões',
      description: 'Visão geral das faturas e limites',
      icon: CreditCard,
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Visão geral do seu controle financeiro</p>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-grid">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div className="stat-card" key={idx}>
              <div
                className="stat-icon"
                style={{ backgroundColor: stat.bg }}
              >
                <Icon size={22} style={{ color: stat.color }} />
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Widget Placeholders */}
      <div className="dashboard-grid-wide">
        {widgets.map((widget, idx) => {
          const Icon = widget.icon;
          return (
            <div className="widget-placeholder" key={idx}>
              <div className="widget-placeholder-icon">
                <Icon size={28} />
              </div>
              <div className="widget-placeholder-title">{widget.title}</div>
              <div className="widget-placeholder-text">{widget.description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardPage;
