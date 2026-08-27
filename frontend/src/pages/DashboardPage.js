import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Target,
  ChevronDown,
  ChevronUp,
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
  const [expandedPrevisao, setExpandedPrevisao] = useState({});

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
    resumoCartoes,
    previsaoSaldo,
  } = dashboardData;

  const investimentosTotal = investimentos.reduce((acc, curr) => acc + curr.valor, 0);
  // Devoluções ainda a receber no mês — já somadas em entradasPrevistas da previsão,
  // exibidas aqui como detalhe do card de entradas do mês.
  const devolucoesMesAtual = previsaoSaldo?.mesAtual?.detalhes?.devolucoesPrevistas || 0;
  // Dinheiro aplicado em investimentos sai do caixa disponível mas nunca é lançado
  // como transação de SAÍDA, então precisa ser descontado para não inflar o saldo.
  const saldoTotal = saldoGeral.totalEntradas - saldoGeral.totalSaidas - investimentosTotal;

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
      details: devolucoesMesAtual > 0
        ? [{ categoria: 'Devoluções a receber', valor: devolucoesMesAtual }]
        : null,
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

  const limiteTotalGeral = resumoCartoes.reduce((acc, c) => acc + c.limiteTotal, 0);
  const faturaTotalGeral = resumoCartoes.reduce((acc, c) => acc + c.faturaAtual, 0);
  const percUtilizadoGeral = limiteTotalGeral > 0 ? (faturaTotalGeral / limiteTotalGeral) * 100 : 0;

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

      {/* Previsão de Saldo — Mês Atual e Próximo Mês */}
      {previsaoSaldo && (
        <div className="dashboard-grid-wide mb-6">
          {[
            { key: 'mesAtual', previsao: previsaoSaldo.mesAtual, titulo: 'Previsão de Saldo — Mês Atual' },
            { key: 'proximoMes', previsao: previsaoSaldo.proximoMes, titulo: 'Previsão de Saldo — Próximo Mês' },
          ].map(({ key, previsao, titulo }) => {
            const isPositivo = previsao.saldoFinal >= 0;
            // Contas do mês: as já quitadas continuam na lista (riscadas), as pendentes
            // vêm primeiro e recebem destaque.
            // Devoluções aparecem agrupadas por devedor — interessa o total que a pessoa
            // deve no mês, não a descrição de cada dívida. Pendentes e já recebidas ficam
            // em linhas separadas para preservar o risco/destaque de cada status.
            const devolucoesPorDevedor = Object.values(
              previsao.detalhes.devolucoes.reduce((acc, d) => {
                // Três estados distintos por devedor: já lançado como transação,
                // quitado em Empréstimos mas sem lançamento, e ainda em aberto.
                const status = d.pago ? 'pago' : (d.quitado ? 'quitado' : 'pendente');
                const chave = `${d.nome}||${status}`;
                if (!acc[chave]) {
                  acc[chave] = {
                    id: `devolucao-${chave}`,
                    tipo: 'ENTRADA',
                    rotulo: `Devedor ${d.nome}`,
                    valor: 0,
                    pago: d.pago,
                    quitado: d.quitado && !d.pago,
                  };
                }
                acc[chave].valor += d.valor;
                return acc;
              }, {})
            );

            const contas = [
              ...previsao.detalhes.receitasRecorrentes.map(r => ({ id: `receita-${r.id}`, tipo: 'ENTRADA', rotulo: r.nome, valor: r.valor, pago: r.pago })),
              ...devolucoesPorDevedor,
              ...previsao.detalhes.despesasFixas.map(d => ({ id: `despesa-${d.id}`, tipo: 'SAIDA', rotulo: d.nome, valor: d.valor, pago: d.pago })),
              ...previsao.detalhes.faturasCartao.map((f, i) => ({ id: `fatura-${i}`, tipo: 'SAIDA', rotulo: `Fatura ${f.nome}`, valor: f.valor, pago: f.pago })),
            ].sort((a, b) => {
              const rank = (c) => (c.pago ? 2 : c.quitado ? 1 : 0);
              return rank(a) - rank(b);
            });
            const qtdPendentes = contas.filter(c => !c.pago).length;
            const isExpanded = !!expandedPrevisao[key];

            return (
              <div className="glass-card" key={key} style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '10px' }}>
                  <h3 className="glass-card-title m-0">{titulo}</h3>
                  <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {mesesNome[previsao.mes - 1]}/{previsao.ano}
                  </span>
                </div>

                <div style={{ fontSize: '28px', fontWeight: 700, color: isPositivo ? '#22c55e' : '#ef4444', marginBottom: '16px' }}>
                  {formatCurrency(previsao.saldoFinal)}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginBottom: contas.length > 0 ? '14px' : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                    <span>Saldo Inicial</span>
                    <span>{formatCurrency(previsao.saldoInicial)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e' }}>
                    <span>+ Entradas Previstas</span>
                    <span>{formatCurrency(previsao.entradasPrevistas)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                    <span>- Saídas Previstas</span>
                    <span>{formatCurrency(previsao.saidasPrevistas)}</span>
                  </div>
                </div>

                {contas.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                    <button
                      onClick={() => setExpandedPrevisao(prev => ({ ...prev, [key]: !prev[key] }))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#94a3b8',
                      }}
                    >
                      <span>
                        Contas a pagar/receber ({qtdPendentes} pendente{qtdPendentes === 1 ? '' : 's'} de {contas.length})
                      </span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {isExpanded && (
                      <div style={{ marginTop: '10px' }}>
                        {contas.map((item) => {
                          const isEntrada = item.tipo === 'ENTRADA';
                          // Quitado em Empréstimos mas sem transação lançada: o dinheiro
                          // não entrou no caixa, então continua contando como previsto.
                          const semLancamento = !item.pago && item.quitado;
                          const statusLabel = item.pago
                            ? (isEntrada ? 'Recebido' : 'Pago')
                            : semLancamento
                              ? 'recebido, sem lançamento'
                              : (isEntrada ? 'a receber' : 'a pagar');
                          const riscado = item.pago ? 'line-through' : 'none';
                          const corStatus = item.pago ? '#22c55e' : semLancamento ? '#f59e0b' : '#64748b';
                          const corBorda = item.pago
                            ? 'transparent'
                            : semLancamento ? '#f59e0b' : (isEntrada ? '#22c55e' : '#ef4444');

                          return (
                            <div
                              key={item.id}
                              title={semLancamento ? 'Marcado como recebido em Empréstimos, mas sem transação de entrada lançada — segue contando como previsto' : undefined}
                              style={{
                                fontSize: '11px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'baseline',
                                gap: '8px',
                                marginBottom: '5px',
                                paddingLeft: '6px',
                                borderLeft: `2px solid ${corBorda}`,
                              }}
                            >
                              <span style={{ color: item.pago ? '#64748b' : '#e2e8f0', fontWeight: item.pago ? 400 : 600 }}>
                                <span style={{ textDecoration: riscado }}>{item.rotulo}</span>{' '}
                                <span style={{ color: corStatus, fontWeight: 600 }}>
                                  ({statusLabel})
                                </span>
                              </span>
                              <span
                                style={{
                                  whiteSpace: 'nowrap',
                                  textDecoration: riscado,
                                  fontWeight: item.pago ? 400 : 600,
                                  color: item.pago ? '#64748b' : (isEntrada ? '#22c55e' : '#ef4444'),
                                }}
                              >
                                {formatCurrency(item.valor)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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

          {resumoCartoes.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', padding: '12px', background: 'rgba(15, 23, 42, 0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Limite Total</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{formatCurrency(limiteTotalGeral)}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Faturas Somadas</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#06b6d4' }}>{formatCurrency(faturaTotalGeral)}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Utilizado</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: percUtilizadoGeral > 85 ? '#ef4444' : percUtilizadoGeral > 70 ? '#f59e0b' : '#22c55e' }}>
                  {percUtilizadoGeral.toFixed(0)}%
                </div>
              </div>
            </div>
          )}

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
                      {card.faturaPaga && (
                        <span
                          className="badge badge-success"
                          title="Existe uma transação de saída com o mesmo nome do cartão neste mês"
                        >
                          Paga
                        </span>
                      )}
                    </span>
                    <span style={{color: '#64748b', fontSize: '11px'}}>Venc. {card.vencimentoDia}</span>
                  </div>
                  
                  <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ height: '100%', width: `${percClean}%`, backgroundColor: barColor, borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: card.faturaPaga ? '#64748b' : barColor, fontWeight: 500, textDecoration: card.faturaPaga ? 'line-through' : 'none' }}>
                      Fatura: {formatCurrency(card.faturaAtual)}
                    </span>
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
