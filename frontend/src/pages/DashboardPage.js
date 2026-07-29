import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart as PieChartIcon,
  BarChart3,
  ArrowRightLeft,
  CreditCard,
  Target,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
import ApiService from '../services/ApiService';

// Cores para o gráfico de Donut
const COLORS = ['#06b6d4', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6'];

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState('daily'); // 'daily' or 'monthly'

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Erro ao carregar dashboard', error);
      alert('Erro ao carregar dados do dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDateSafe = (dateStr) => {
    if (!dateStr) return '-';
    // Resolve problemas de fuso convertendo YYYY-MM-DD para strings
    const justDate = String(dateStr).trim().split('T')[0];
    const [yr, mo, da] = justDate.split('-');
    if(yr && mo && da) return `${da}/${mo}/${yr}`;
    return dateStr;
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral do seu controle financeiro</p>
        </div>
        <p className="loading-text">Carregando dashboard...</p>
      </div>
    );
  }

  const {
    saldoGeral,
    mesAtual,
    investimentos,
    entradasVsSaidasDiario,
    entradasVsSaidasMensal,
    gastosPorCategoria,
    ultimasTransacoes,
    resumoCartoes
  } = dashboardData;

  const saldoTotal = saldoGeral.totalEntradas - saldoGeral.totalSaidas;
  const investimentosTotal = investimentos.reduce((acc, curr) => acc + curr.valor, 0);

  const statCards = [
    {
      label: 'Saldo Geral',
      value: formatCurrency(saldoTotal),
      icon: Wallet,
      color: '#06b6d4',
      bg: 'rgba(6, 182, 212, 0.12)',
    },
    {
      label: 'Entradas do Mês',
      value: formatCurrency(mesAtual.entradas),
      icon: TrendingUp,
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.12)',
    },
    {
      label: 'Saídas do Mês',
      value: formatCurrency(mesAtual.saidas),
      icon: TrendingDown,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
    },
    {
      label: 'Investimentos',
      value: formatCurrency(investimentosTotal),
      icon: Target,
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.12)',
      details: investimentos,
    },
  ];

  const mesesNome = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Visão geral do seu controle financeiro</p>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-grid mb-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div className="stat-card" key={idx} style={{ padding: '20px' }}>
              <div
                className="stat-icon"
                style={{ backgroundColor: stat.bg, width: '40px', height: '40px', marginBottom: '12px' }}
              >
                <Icon size={20} style={{ color: stat.color }} />
              </div>
              <div className="stat-value" style={{ fontSize: '24px' }}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              
              {/* Tooltip inline para investimentos */}
              {stat.details && stat.details.length > 0 && (
                <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                  {stat.details.map(d => (
                    <div key={d.categoria} style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span>{d.categoria}:</span>
                      <span>{formatCurrency(d.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid de Gráficos Principais */}
      <div className="dashboard-grid-wide" style={{ marginBottom: '24px' }}>
        
        {/* Gráfico Barras: Entradas vs Saídas */}
        <div className="glass-card" style={{ padding: '20px', minHeight: '380px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 className="glass-card-title m-0">Entradas vs Saídas</h3>
            <div className="tabs-container" style={{ margin: 0, padding: 0, borderBottom: 'none' }}>
              <button 
                className={`tab-btn ${chartView === 'daily' ? 'active' : ''}`}
                onClick={() => setChartView('daily')}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Mês Atual
              </button>
              <button 
                className={`tab-btn ${chartView === 'monthly' ? 'active' : ''}`}
                onClick={() => setChartView('monthly')}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Ano Atual
              </button>
            </div>
          </div>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartView === 'daily' ? entradasVsSaidasDiario : entradasVsSaidasMensal}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey={chartView === 'daily' ? 'dia' : 'mes'} 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickFormatter={(val) => chartView === 'daily' ? `${val}` : mesesNome[val-1]}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickFormatter={(val) => `R$${val/1000}k`} 
                />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.02)'}}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(val) => chartView === 'daily' ? `Dia ${val}` : `Mês ${mesesNome[val-1]}`}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }}/>
                <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Donut: Gastos por Categoria */}
        <div className="glass-card" style={{ padding: '20px', minHeight: '380px' }}>
          <h3 className="glass-card-title mb-4">Gastos por Categoria</h3>
          {gastosPorCategoria && gastosPorCategoria.length > 0 ? (
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={gastosPorCategoria}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="total"
                    nameKey="categoria"
                    stroke="none"
                  >
                    {gastosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#64748b' }}>
              Nenhum gasto registrado este mês.
            </div>
          )}
        </div>

      </div>

      {/* Grid de Listas e Tabelas */}
      <div className="dashboard-grid-wide" style={{ marginTop: '0' }}>
        
        {/* Últimas Transações */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 className="glass-card-title mb-4">Últimas Transações</h3>
          <div className="overflow-x-auto">
            <table className="dark-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px' }}>Data</th>
                  <th style={{ padding: '10px' }}>Descrição</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {ultimasTransacoes.map((tx) => (
                  <tr key={tx.ID}>
                    <td style={{ padding: '10px', fontSize: '13px' }}>{formatDateSafe(tx.DATA)}</td>
                    <td style={{ padding: '10px', fontSize: '13px' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                        {tx.DESCRICAO}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{tx.categoria_nome || 'Sem Categoria'}</div>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 500, color: tx.TIPO === 'ENTRADA' ? '#22c55e' : '#ef4444', fontSize: '14px' }}>
                      {tx.TIPO === 'SAIDA' ? '-' : '+'}{formatCurrency(tx.VALOR).replace('R$', '').trim()}
                    </td>
                  </tr>
                ))}
                {ultimasTransacoes.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                      Nenhuma transação encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo de Cartões */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 className="glass-card-title mb-4">Resumo de Cartões</h3>
          <div>
            {resumoCartoes.map((card) => {
              const perc = card.limiteTotal > 0 ? (card.faturaAtual / card.limiteTotal) * 100 : 0;
              const percClean = Math.min(100, Math.max(0, perc));
              const isDanger = percClean > 85;
              const isWarning = percClean > 70 && !isDanger;
              const barColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#06b6d4';
              
              return (
                <div key={card.id} style={{ marginBottom: '16px', padding: '12px', background: 'rgba(15, 23, 42, 0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={14} style={{ color: '#94a3b8' }}/> 
                      {card.nome}
                    </span>
                    <span style={{color: '#64748b', fontSize: '11px'}}>Venc. {card.vencimentoDia}</span>
                  </div>
                  
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ height: '100%', width: `${percClean}%`, backgroundColor: barColor, borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: barColor, fontWeight: 500 }}>Fatura: {formatCurrency(card.faturaAtual)}</span>
                    <span style={{ color: '#64748b' }}>Limite: {formatCurrency(card.limiteTotal)}</span>
                  </div>
                </div>
              );
            })}
            {resumoCartoes.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                Nenhum cartão encontrado.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
