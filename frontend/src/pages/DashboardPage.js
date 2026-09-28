import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  PiggyBank,
  ChartColumn,
  ChartPie,
  ReceiptText,
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
  Cell,
  Sector
} from 'recharts';
import ApiService from '../services/ApiService';
import { COLORS, BRAND, CHART_PALETTE } from '../constants/theme';

// Estilo único do tooltip dos gráficos — o mesmo vidro escuro de .recharts-default-tooltip.
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(16, 16, 18, 0.92)',
  border: `1px solid ${COLORS.borderLight}`,
  borderRadius: '12px',
  boxShadow: '0 16px 32px -12px rgba(0, 0, 0, 0.8)',
};

// Título de card com ícone: chip de vidro com o ícone em Água, título em Manrope.
const TituloCard = ({ icon: Icon, children, className = '' }) => (
  <div className={`card-title-row ${className}`}>
    <span className="card-title-icon" aria-hidden="true">
      <Icon size={16} strokeWidth={1.8} />
    </span>
    <h3 className="glass-card-title m-0">{children}</h3>
  </div>
);

// Fatia em destaque do donut: cresce para fora e escreve no centro a categoria,
// o valor e a fatia do total que ela ocupa.
const renderFatiaAtiva = (formatCurrency) => (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent, cornerRadius } = props;
  return (
    <g>
      <text x={cx} y={cy - 14} textAnchor="middle" fill={COLORS.textSecondary} fontSize={12}>
        {payload.categoria}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill={COLORS.text} fontSize={17} fontWeight={700} fontFamily="Manrope, Inter, sans-serif">
        {formatCurrency(value)}
      </text>
      <text x={cx} y={cy + 26} textAnchor="middle" fill={fill} fontSize={12} fontWeight={600}>
        {`${(percent * 100).toFixed(1).replace('.', ',')}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 10}
        startAngle={startAngle}
        endAngle={endAngle}
        cornerRadius={cornerRadius}
        fill={fill}
        style={{ filter: `drop-shadow(0 0 10px ${fill}66)` }}
      />
    </g>
  );
};

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState('monthly'); // 'daily' or 'monthly'
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
        <p className="loading-text">Carregando dashboard…</p>
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
      label: 'Saldo Atual',
      value: formatCurrency(saldoTotal),
      valueColor: saldoTotal < 0 ? COLORS.danger : undefined,
      icon: Wallet,
      color: null,
      tom: 'brand',
    },
    {
      label: 'Entradas do Mês',
      value: formatCurrency(mesAtual.entradas),
      icon: TrendingUp,
      color: null,
      tom: 'entrada',
      details: devolucoesMesAtual > 0
        ? [{ categoria: 'Devoluções a receber', valor: devolucoesMesAtual }]
        : null,
    },
    {
      label: 'Saídas do Mês',
      value: formatCurrency(mesAtual.saidas),
      icon: TrendingDown,
      color: null,
      tom: 'saida',
    },
    {
      label: 'Investimentos',
      value: formatCurrency(investimentosTotal),
      icon: PiggyBank,
      color: null,
      tom: 'investimento',
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
            <div className="stat-card animate-fade-in" key={idx} style={{ padding: '20px', animationDelay: `${idx * 50}ms` }}>
              <div
                className={`stat-icon stat-icon--${stat.tom}`}
                aria-hidden="true"
              >
                <Icon size={20} strokeWidth={1.8} />
              </div>
              <div className="stat-value" style={{ fontSize: '24px', color: stat.valueColor }}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              
              {/* Tooltip inline para investimentos */}
              {stat.details && stat.details.length > 0 && (
                <div style={{ marginTop: '12px', borderTop: `1px solid ${COLORS.border}`, paddingTop: '8px' }}>
                  {stat.details.map(d => (
                    <div key={d.categoria} style={{ fontSize: '11px', color: COLORS.textSecondary, display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
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
            { key: 'mesAtual', previsao: previsaoSaldo.mesAtual, periodo: 'Previsão de saldo · mês atual' },
            { key: 'proximoMes', previsao: previsaoSaldo.proximoMes, periodo: 'Previsão de saldo · próximo mês' },
          ].map(({ key, previsao, periodo }) => {
            const isPositivo = previsao.saldoFinal >= 0;
            // Contas do mês: as já quitadas continuam na lista (riscadas), as pendentes
            // vêm primeiro e recebem destaque.
            // Devoluções aparecem agrupadas por devedor — interessa o total que a pessoa
            // deve no mês, não a descrição de cada dívida. Pendentes e já recebidas ficam
            // em linhas separadas para preservar o risco/destaque de cada status.
            const devolucoesPorDevedor = Object.values(
              previsao.detalhes.devolucoes.reduce((acc, d) => {
                const somar = (status, valor) => {
                  const chave = `${d.nome}||${status}`;
                  if (!acc[chave]) {
                    acc[chave] = {
                      id: `devolucao-${chave}`,
                      tipo: 'ENTRADA',
                      rotulo: `Devedor ${d.nome}`,
                      valor: 0,
                      pago: status === 'pago',
                      quitado: status === 'quitado',
                      atrasada: status === 'atrasado',
                    };
                  }
                  acc[chave].valor += valor;
                };
                // Quatro estados distintos por devedor: já lançado como transação,
                // quitado em Empréstimos mas sem lançamento, em aberto, e em aberto
                // vindo de um mês anterior (atrasado). Cada um em sua própria linha.
                // `valor` é o que ainda falta da parcela; o que já veio por pagamento
                // parcial entra na linha de recebido do devedor.
                if (d.pago) {
                  somar('pago', d.valorOriginal ?? d.valor);
                  return acc;
                }
                if (d.recebido > 0) somar('pago', d.recebido);
                somar(d.quitado ? 'quitado' : (d.atrasada ? 'atrasado' : 'pendente'), d.valor);
                return acc;
              }, {})
            );

            const contas = [
              ...previsao.detalhes.receitasRecorrentes.map(r => ({ id: `receita-${r.id}`, tipo: 'ENTRADA', rotulo: r.nome, valor: r.valor, pago: r.pago })),
              ...devolucoesPorDevedor,
              ...previsao.detalhes.despesasFixas.map(d => ({ id: `despesa-${d.id}`, tipo: 'SAIDA', rotulo: d.nome, valor: d.valor, pago: d.pago })),
              ...previsao.detalhes.faturasCartao.map((f, i) => ({ id: `fatura-${i}`, tipo: 'SAIDA', rotulo: `Fatura ${f.nome}`, valor: f.valor, pago: f.pago })),
            ].sort((a, b) => {
              // Atrasado primeiro: é a conta que já deveria ter entrado.
              const rank = (c) => (c.pago ? 3 : c.quitado ? 2 : c.atrasada ? 0 : 1);
              return rank(a) - rank(b);
            });
            const qtdPendentes = contas.filter(c => !c.pago).length;
            const isExpanded = !!expandedPrevisao[key];

            return (
              <div className="glass-card prevy-card" key={key} style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '10px' }}>
                  <div className="prevy-titulo">
                    <div>
                      <h3 className="prevy-nome">Prevy</h3>
                      <span className="prevy-periodo">{periodo}</span>
                    </div>
                  </div>
                  <span className="prevy-mes">
                    {mesesNome[previsao.mes - 1]}/{previsao.ano}
                  </span>
                </div>

                <div className="valor-destaque" style={{ fontSize: '30px', fontWeight: 700, lineHeight: 1.2, color: isPositivo ? COLORS.success : COLORS.danger, marginBottom: '16px' }}>
                  {formatCurrency(previsao.saldoFinal)}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginBottom: contas.length > 0 ? '14px' : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: COLORS.textSecondary }}>
                    <span>Saldo Inicial</span>
                    <span>{formatCurrency(previsao.saldoInicial)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: COLORS.success }}>
                    <span>+ Entradas Previstas</span>
                    <span>{formatCurrency(previsao.entradasPrevistas)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: COLORS.danger }}>
                    <span>- Saídas Previstas</span>
                    <span>{formatCurrency(previsao.saidasPrevistas)}</span>
                  </div>
                </div>

                {contas.length > 0 && (
                  <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: '10px' }}>
                    <button
                      onClick={() => setExpandedPrevisao(prev => ({ ...prev, [key]: !prev[key] }))}
                      aria-expanded={isExpanded}
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
                        color: COLORS.textSecondary,
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
                          // Parcela de mês anterior que continua em aberto: o dinheiro
                          // ainda é esperado, então transborda para a previsão deste mês.
                          const atrasado = !item.pago && !item.quitado && item.atrasada;
                          const statusLabel = item.pago
                            ? (isEntrada ? 'Recebido' : 'Pago')
                            : semLancamento
                              ? 'recebido, sem lançamento'
                              : atrasado
                                ? (isEntrada ? 'atrasado, a receber' : 'atrasado, a pagar')
                                : (isEntrada ? 'a receber' : 'a pagar');
                          const riscado = item.pago ? 'line-through' : 'none';
                          const corStatus = item.pago
                            ? COLORS.success
                            : semLancamento ? COLORS.warning : atrasado ? COLORS.danger : COLORS.textMuted;
                          const corBorda = item.pago
                            ? 'transparent'
                            : semLancamento
                              ? COLORS.warning
                              : atrasado ? COLORS.danger : (isEntrada ? COLORS.success : COLORS.danger);

                          return (
                            <div
                              key={item.id}
                              title={
                                semLancamento
                                  ? 'Marcado como recebido em Empréstimos, mas sem transação de entrada lançada — segue contando como previsto'
                                  : atrasado
                                    ? 'Venceu em um mês anterior e continua em aberto — segue contando como previsto neste mês'
                                    : undefined
                              }
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
                              <span style={{ color: item.pago ? COLORS.textMuted : COLORS.text, fontWeight: item.pago ? 400 : 600 }}>
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
                                  color: item.pago ? COLORS.textMuted : (isEntrada ? COLORS.success : COLORS.danger),
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
            <TituloCard icon={ChartColumn}>Entradas vs Saídas</TituloCard>
            <div className="tabs-container" style={{ margin: 0, padding: 0, boxShadow: 'none' }}>
              <button 
                className={`tab-btn ${chartView === 'daily' ? 'active' : ''}`}
                onClick={() => setChartView('daily')}
                aria-pressed={chartView === 'daily'}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Mês Atual
              </button>
              <button 
                className={`tab-btn ${chartView === 'monthly' ? 'active' : ''}`}
                onClick={() => setChartView('monthly')}
                aria-pressed={chartView === 'monthly'}
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
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="grad-entradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.success} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={COLORS.success} stopOpacity={0.35} />
                  </linearGradient>
                  <linearGradient id="grad-saidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLORS.danger} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={COLORS.danger} stopOpacity={0.35} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                <XAxis 
                  dataKey={chartView === 'daily' ? 'dia' : 'mes'} 
                  stroke={COLORS.textSecondary} 
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: COLORS.border }}
                  tickFormatter={(val) => chartView === 'daily' ? `${val}` : mesesNome[val-1]}
                />
                <YAxis 
                  stroke={COLORS.textSecondary} 
                  fontSize={12} 
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(val) => `R$${val/1000}k`} 
                />
                <Tooltip 
                  cursor={{fill: COLORS.bgHover}}
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: COLORS.text }}
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(val) => chartView === 'daily' ? `Dia ${val}` : `Mês ${mesesNome[val-1]}`}
                />
                <Legend iconType="circle" iconSize={9} wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}/>
                <Bar dataKey="entradas" name="Entradas" fill="url(#grad-entradas)" radius={[6, 6, 2, 2]} maxBarSize={40} />
                <Bar dataKey="saidas" name="Saídas" fill="url(#grad-saidas)" radius={[6, 6, 2, 2]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Donut: Gastos por Categoria */}
        <div className="glass-card" style={{ padding: '20px', minHeight: '380px' }}>
          <TituloCard icon={ChartPie} className="mb-4">Gastos por Categoria</TituloCard>
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
                    paddingAngle={4}
                    cornerRadius={6}
                    dataKey="total"
                    nameKey="categoria"
                    stroke="none"
                    activeShape={renderFatiaAtiva(formatCurrency)}
                  >
                    {gastosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                    ))}
                  </Pie>
                  {/* Sem caixa de tooltip: a fatia em destaque já escreve os dados no
                      centro. O Tooltip continua porque é ele que ativa a fatia no hover. */}
                  <Tooltip content={() => null} cursor={false} />
                  <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" iconSize={9} wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: COLORS.textMuted }}>
              Nenhum gasto registrado este mês.
            </div>
          )}
        </div>

      </div>

      {/* Grid de Listas e Tabelas */}
      <div className="dashboard-grid-wide" style={{ marginTop: '0' }}>
        
        {/* Últimas Transações */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <TituloCard icon={ReceiptText} className="mb-4">Últimas Transações</TituloCard>
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
                      <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '2px' }}>{tx.categoria_nome || 'Sem Categoria'}</div>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 500, color: tx.TIPO === 'ENTRADA' ? COLORS.success : COLORS.danger, fontSize: '14px' }}>
                      {tx.TIPO === 'SAIDA' ? '-' : '+'}{formatCurrency(tx.VALOR).replace('R$', '').trim()}
                    </td>
                  </tr>
                ))}
                {ultimasTransacoes.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: COLORS.textMuted }}>
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
          <TituloCard icon={CreditCard} className="mb-4">Resumo de Cartões</TituloCard>

          {resumoCartoes.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', padding: '12px', background: COLORS.inputBg, borderRadius: '12px', border: `1px solid ${COLORS.borderSubtle}` }}>
              <div>
                <div style={{ fontSize: '10px', color: COLORS.textMuted, marginBottom: '2px' }}>Limite Total</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.text }}>{formatCurrency(limiteTotalGeral)}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: COLORS.textMuted, marginBottom: '2px' }}>Faturas Somadas</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.primary }}>{formatCurrency(faturaTotalGeral)}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: COLORS.textMuted, marginBottom: '2px' }}>Utilizado</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: percUtilizadoGeral > 85 ? COLORS.danger : percUtilizadoGeral > 70 ? COLORS.warning : COLORS.success }}>
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
              const barColor = isDanger ? COLORS.danger : isWarning ? COLORS.warning : COLORS.primary;
              
              return (
                <div key={card.id} style={{ marginBottom: '16px', padding: '12px', background: COLORS.inputBg, borderRadius: '12px', border: `1px solid ${COLORS.borderSubtle}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, color: COLORS.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={14} strokeWidth={1.8} style={{ color: COLORS.textSecondary }} aria-hidden="true" />
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
                    <span style={{color: COLORS.textMuted, fontSize: '11px'}}>Venc. {card.vencimentoDia}</span>
                  </div>
                  
                  <div style={{ width: '100%', height: '6px', backgroundColor: COLORS.border, borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ height: '100%', width: `${percClean}%`, background: isDanger || isWarning ? barColor : BRAND.gradient, borderRadius: '3px', transition: 'width 0.5s ease' }}></div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: card.faturaPaga ? COLORS.textMuted : barColor, fontWeight: 500, textDecoration: card.faturaPaga ? 'line-through' : 'none' }}>
                      Fatura: {formatCurrency(card.faturaAtual)}
                    </span>
                    <span style={{ color: COLORS.textMuted }}>Limite: {formatCurrency(card.limiteTotal)}</span>
                  </div>
                </div>
              );
            })}
            {resumoCartoes.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: COLORS.textMuted }}>
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
