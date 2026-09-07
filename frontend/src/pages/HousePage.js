import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Save, X, ChevronDown, ChevronUp, Check, CheckCheck, Edit2, Trash2, RotateCcw, FileText } from 'lucide-react';
import ApiService from '../services/ApiService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import { COLORS, FONT } from '../constants/theme';

// A metade do custo da casa é dívida da parceira e aparece como "Div. Casa" na
// página de Empréstimos. Espelha DEVEDOR_DIVISAO_CASA / FRACAO_DIVISAO_CASA em
// LoansPage.js e em api/routes/dashboard.js — a regra vive nos três lugares.
const DEVEDOR_DIVISAO_CASA = 'Amor';
const FRACAO_DIVISAO_CASA = 0.5;

// Chave da corrente de parcelas: mesma compra = mesma descrição + mesma
// categoria. Espelha o agrupamento de api/routes/houseExpenses.js, que é quem
// edita e exclui a corrente inteira.
const chaveCorrente = (gasto) =>
  `${String(gasto.descricao || '').trim().toUpperCase()}||${String(gasto.categoria || 'Outros').trim().toUpperCase()}`;

const CATEGORIAS = ['Reforma', 'Melhorias', 'Decoração', 'Manutenção', 'Móveis', 'Utensílios', 'Eletrodomésticos', 'Limpeza', 'Outros'];

const CATEGORIA_OPTIONS = CATEGORIAS.map((c) => ({ value: c, label: c }));

const emptyForm = {
  descricao: '',
  categoria: 'Reforma',
  valor_mensal: '',
  parcelas: 1,
  parcelas_pagas: 0,
  data_vencimento: new Date().toISOString().split('T')[0],
};

const HousePage = () => {
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [expanded, setExpanded] = useState({});
  const [resumoAberto, setResumoAberto] = useState(false);

  useEffect(() => {
    loadGastos();
  }, []);

  const loadGastos = async () => {
    try {
      const data = await ApiService.getHouseExpenses();
      setGastos(data);
    } catch (error) {
      alert('Erro ao carregar gastos da casa');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parcelas = Number(formData.parcelas) || 1;
    const parcelaAtual = Math.min(Number(formData.parcelas_pagas || 0) + 1, parcelas);
    const payload = {
      descricao: formData.descricao,
      categoria: formData.categoria || 'Outros',
      valor_mensal: formData.valor_mensal,
      parcelas,
      parcela_atual: parcelaAtual,
      data_vencimento: formData.data_vencimento,
    };

    try {
      if (editingId) {
        await ApiService.updateHouseExpense(editingId, payload);
        resetForm();
      } else {
        await ApiService.createHouseExpense(payload);
        setFormData({
          ...emptyForm,
          categoria: formData.categoria,
          data_vencimento: formData.data_vencimento,
        });
      }
      loadGastos();
    } catch (error) {
      alert('Erro ao salvar gasto da casa');
    }
  };

  const handleEdit = (gasto) => {
    setEditingId(gasto.id);
    setFormData({
      descricao: gasto.descricao,
      categoria: gasto.categoria || 'Outros',
      valor_mensal: gasto.valor_mensal,
      parcelas: gasto.parcelas,
      parcelas_pagas: Math.max((gasto.parcela_atual || 1) - 1, 0),
      data_vencimento: gasto.data_vencimento ? String(gasto.data_vencimento).split('T')[0] : '',
    });
  };

  // A API exclui a corrente inteira, não só a linha visível — apagar uma parcela
  // só faz a anterior voltar a ser a cabeça e reaparecer na lista.
  const handleDelete = async (gasto) => {
    const naCorrente = gastos.filter((g) => chaveCorrente(g) === chaveCorrente(gasto)).length;
    const aviso = naCorrente > 1
      ? `Excluir "${gasto.descricao}"?\n\nIsso remove as ${naCorrente} parcelas desse gasto, incluindo as já pagas.`
      : `Deseja realmente excluir "${gasto.descricao}"?`;
    if (!window.confirm(aviso)) return;
    try {
      await ApiService.deleteHouseExpense(gasto.id);
      loadGastos();
    } catch (error) {
      alert('Erro ao excluir gasto da casa');
    }
  };

  // Marca a parcela do mês como paga — a API já projeta a parcela seguinte
  // quando ainda houver parcelas restantes.
  const handlePagar = async (gasto) => {
    try {
      await ApiService.payHouseExpense(gasto.id);
      loadGastos();
    } catch (error) {
      alert('Erro ao marcar o gasto como pago');
    }
  };

  const handlePagarTudo = async (grupo) => {
    const pendentes = grupo.itens.filter((g) => !g.status_pago);
    if (pendentes.length === 0) return;
    if (!window.confirm(`Marcar as ${pendentes.length} parcela(s) pendente(s) de ${grupo.categoria} como pagas?`)) return;
    try {
      for (const gasto of pendentes) {
        await ApiService.payHouseExpense(gasto.id);
      }
      loadGastos();
    } catch (error) {
      alert('Erro ao marcar parcelas como pagas');
    }
  };

  const toggleExpanded = (categoria) => {
    setExpanded((prev) => ({ ...prev, [categoria]: !prev[categoria] }));
  };

  const formatCurrency = useCallback((value) => (
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
  ), []);

  const formatDate = (date) => {
    if (!date) return '-';
    const str = String(date).trim().split('T')[0];
    const d = new Date(str + 'T00:00:00');
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
  };

  // Destaca a reta final do parcelamento: 2 parcelas restantes em azul,
  // a última em verde. `padrao` é a cor usada nos demais casos.
  const corRestantes = (restantes, padrao) => {
    if (restantes === 1) return COLORS.success;
    if (restantes === 2) return COLORS.info;
    return padrao;
  };

  const isMesAtual = (date) => {
    if (!date) return false;
    const str = String(date).trim().split('T')[0];
    const d = new Date(str + 'T00:00:00');
    const hoje = new Date();
    return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth();
  };

  const isAtrasado = (gasto) => {
    if (gasto.status_pago) return false;
    const str = String(gasto.data_vencimento).trim().split('T')[0];
    const d = new Date(str + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return d < hoje;
  };

  const parseData = (date) => {
    if (!date) return null;
    const str = String(date).trim().split('T')[0];
    const d = new Date(str + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  };

  const isProximoMes = (date) => {
    const d = parseData(date);
    if (!d) return false;
    const hoje = new Date();
    const prox = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    return d.getFullYear() === prox.getFullYear() && d.getMonth() === prox.getMonth();
  };

  const isMesFuturo = (date) => {
    if (!date) return false;
    const str = String(date).trim().split('T')[0];
    const d = new Date(str + 'T00:00:00');
    const hoje = new Date();
    return d.getFullYear() > hoje.getFullYear()
      || (d.getFullYear() === hoje.getFullYear() && d.getMonth() > hoje.getMonth());
  };

  // Cada parcela é uma linha própria, então logo após quitar a parcela do mês a
  // API já cria a parcela seguinte — o que faria o mesmo gasto aparecer duas
  // vezes na lista (uma "Pago" e uma "Pendente" do mês que vem). Aqui montamos
  // as "correntes" de parcelas (mesma descrição + categoria, parcela_atual
  // sequencial) e mantemos visível apenas uma linha por corrente:
  //   - a parcela pendente, quando o mês dela já chegou (ou está atrasada);
  //   - senão a última parcela paga, marcada com `projetado` para indicar que a
  //     próxima já está agendada para o mês seguinte.
  const gastosProcessados = useMemo(() => {
    const chaveDe = chaveCorrente;
    const porChave = {};
    gastos.forEach((g) => {
      const chave = chaveDe(g);
      if (!porChave[chave]) porChave[chave] = [];
      porChave[chave].push(g);
    });

    const vizinho = (g, offset) => (porChave[chaveDe(g)] || [])
      .find((o) => Number(o.parcela_atual) === Number(g.parcela_atual) + offset);

    const visiveis = new Set();
    gastos.forEach((g) => {
      if (g.status_pago) return;
      const anterior = vizinho(g, -1);
      // parcela futura que só existe porque a anterior foi quitada: fica oculta
      if (anterior && anterior.status_pago && isMesFuturo(g.data_vencimento)) return;
      visiveis.add(g.id);
    });
    gastos.forEach((g) => {
      if (!g.status_pago) return;
      const proxima = vizinho(g, 1);
      // a próxima parcela já assumiu o lugar desta na lista
      if (proxima && visiveis.has(proxima.id)) return;
      visiveis.add(g.id);
    });

    return gastos.map((g) => ({
      ...g,
      visivel: visiveis.has(g.id),
      projetado: !!(g.status_pago && vizinho(g, 1)),
    }));
  }, [gastos]);

  const grupos = useMemo(() => {
    const porCategoria = {};
    gastosProcessados.forEach((gasto) => {
      const categoria = gasto.categoria || 'Outros';
      if (!porCategoria[categoria]) {
        porCategoria[categoria] = [];
      }
      porCategoria[categoria].push(gasto);
    });

    return Object.entries(porCategoria)
      .map(([categoria, todos]) => {
        const doMes = todos.filter((g) => isMesAtual(g.data_vencimento));
        const totalMesAtual = doMes.reduce((acc, g) => acc + Number(g.valor_mensal), 0);
        const pendentesMes = doMes.filter((g) => !g.status_pago).length;
        const pendentes = todos.filter((g) => !g.status_pago).length;
        const itens = todos.filter((g) => g.visivel);

        return { categoria, itens, totalMesAtual, pendentesMes, pendentes };
      })
      .sort((a, b) => b.totalMesAtual - a.totalMesAtual || a.categoria.localeCompare(b.categoria));
  }, [gastosProcessados]);

  const totais = useMemo(() => {
    const doMes = gastos.filter((g) => isMesAtual(g.data_vencimento));
    const custoMes = doMes.reduce((acc, g) => acc + Number(g.valor_mensal), 0);

    // Custo do próximo mês: as parcelas já lançadas para lá mais as que só vão
    // nascer quando as pendências deste mês forem quitadas. Parte da cabeça de
    // cada corrente (descrição + categoria, parcela de maior número), a mesma
    // regra que a página de Empréstimos usa para projetar as devoluções — é este
    // número que alimenta a metade da parceira no mês que vem.
    const hoje = new Date();
    const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    const cabecas = new Map();
    gastos.forEach((g) => {
      const chave = chaveCorrente(g);
      const atual = cabecas.get(chave);
      if (!atual || Number(g.parcela_atual) > Number(atual.parcela_atual)) {
        cabecas.set(chave, g);
      }
    });

    let custoProximoMes = gastos
      .filter((g) => isProximoMes(g.data_vencimento))
      .reduce((acc, g) => acc + Number(g.valor_mensal), 0);

    cabecas.forEach((g) => {
      if (isProximoMes(g.data_vencimento)) return; // parcela já lançada, contada acima
      const d = parseData(g.data_vencimento);
      if (!d || d > fimMesAtual) return; // parcela de um mês mais à frente
      if (Number(g.parcela_atual) >= Number(g.parcelas)) return; // corrente encerrada
      custoProximoMes += Number(g.valor_mensal);
    });

    return {
      custoMes,
      custoProximoMes,
      divisaoMes: custoMes * FRACAO_DIVISAO_CASA,
      divisaoProximoMes: custoProximoMes * FRACAO_DIVISAO_CASA,
      pagoMes: doMes.filter((g) => g.status_pago).reduce((acc, g) => acc + Number(g.valor_mensal), 0),
      pendenteMes: doMes.filter((g) => !g.status_pago).reduce((acc, g) => acc + Number(g.valor_mensal), 0),
      // Soma o que ainda falta pagar de todas as parcelas futuras já projetadas
      restanteTotal: gastos
        .filter((g) => !g.status_pago)
        .reduce((acc, g) => {
          const restantes = Math.max(Number(g.parcelas) - Number(g.parcela_atual) + 1, 1);
          return acc + Number(g.valor_mensal) * restantes;
        }, 0),
    };
  }, [gastos]);

  // Resumo simplificado: todas as parcelas em aberto agrupadas por categoria
  const resumo = useMemo(() => {
    const pendentes = gastos.filter((g) => !g.status_pago);
    const porCategoria = {};
    pendentes.forEach((g) => {
      const categoria = g.categoria || 'Outros';
      if (!porCategoria[categoria]) porCategoria[categoria] = [];
      porCategoria[categoria].push(g);
    });

    const categorias = Object.entries(porCategoria)
      .map(([categoria, itens]) => ({
        categoria,
        itens: [...itens].sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento)),
        subtotal: itens.reduce((acc, g) => acc + Number(g.valor_mensal), 0),
      }))
      .sort((a, b) => b.subtotal - a.subtotal || a.categoria.localeCompare(b.categoria));

    return {
      categorias,
      total: categorias.reduce((acc, c) => acc + c.subtotal, 0),
      quantidade: pendentes.length,
    };
  }, [gastos]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Casa</h1>
        <p className="page-subtitle">Registre compras e investimentos feitos para a casa</p>
      </div>

      {/* Totalizador em destaque */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: FONT.sizes.xs, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Custo Total da Casa · mês atual
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ fontSize: FONT.sizes.xxl, fontWeight: FONT.weights.bold, color: COLORS.text, lineHeight: 1.2 }}>
              {formatCurrency(totais.custoMes)}
            </div>
            <button
              onClick={() => setResumoAberto(true)}
              className="action-btn action-btn-edit"
              title="Ver resumo simplificado de todos os valores"
              style={{ gap: '6px', width: 'auto', padding: '6px 10px', fontSize: FONT.sizes.sm }}
            >
              <FileText size={14} />
              Simplificado
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <div style={{ fontSize: FONT.sizes.xs, color: COLORS.textMuted }}>Pendente no mês</div>
            <div style={{ fontSize: FONT.sizes.lg, fontWeight: FONT.weights.bold, color: totais.pendenteMes > 0 ? COLORS.danger : COLORS.success }}>
              {formatCurrency(totais.pendenteMes)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: FONT.sizes.xs, color: COLORS.textMuted }}>Já pago no mês</div>
            <div style={{ fontSize: FONT.sizes.lg, fontWeight: FONT.weights.bold, color: COLORS.success }}>
              {formatCurrency(totais.pagoMes)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: FONT.sizes.xs, color: COLORS.textMuted }}>No próximo mês</div>
            <div
              style={{ fontSize: FONT.sizes.lg, fontWeight: FONT.weights.bold, color: COLORS.info }}
              title="Parcelas já lançadas para o próximo mês, mais as que serão geradas ao quitar as pendências deste mês"
            >
              {formatCurrency(totais.custoProximoMes)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: FONT.sizes.xs, color: COLORS.textMuted }}>
              Divisão {DEVEDOR_DIVISAO_CASA} ({Math.round(FRACAO_DIVISAO_CASA * 100)}%)
            </div>
            <div
              style={{ fontSize: FONT.sizes.lg, fontWeight: FONT.weights.bold, color: COLORS.success }}
              title={`Metade do custo da casa, cobrada de ${DEVEDOR_DIVISAO_CASA} como "Div. Casa" na página de Empréstimos. Próximo mês: ${formatCurrency(totais.divisaoProximoMes)}`}
            >
              {formatCurrency(totais.divisaoMes)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: FONT.sizes.xs, color: COLORS.textMuted }}>Falta pagar (total)</div>
            <div style={{ fontSize: FONT.sizes.lg, fontWeight: FONT.weights.bold, color: COLORS.warning }}>
              {formatCurrency(totais.restanteTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Inclusão rápida */}
      <Card>
        <div style={{ marginBottom: '20px' }}>
          <h2 className="glass-card-title" style={{ marginBottom: '4px' }}>
            {editingId ? 'Editar Gasto' : 'Novo Gasto da Casa'}
          </h2>
          <p className="glass-card-subtitle" style={{ margin: 0 }}>
            {editingId ? 'Editando registro' : 'Cadastre rapidamente uma compra ou serviço da casa'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px' }}>
            <div style={{ flex: '2 1 200px' }}>
              <Input
                label="Descrição"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Ex: Tinta, Pedreiro, Sofá"
                required
              />
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <Select
                label="Categoria"
                options={CATEGORIA_OPTIONS}
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                placeholder="Selecione..."
                required
              />
            </div>
            <div style={{ width: '150px' }}>
              <Input
                label="Vencimento"
                type="date"
                value={formData.data_vencimento}
                onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                required
              />
            </div>
            <div style={{ width: '130px' }}>
              <Input
                label="Valor Mensal"
                type="number"
                step="0.01"
                value={formData.valor_mensal}
                onChange={(e) => setFormData({ ...formData, valor_mensal: e.target.value })}
                required
              />
            </div>
            <div style={{ width: '90px' }}>
              <Input
                label="Parcelas"
                type="number"
                min="1"
                value={formData.parcelas}
                onChange={(e) => setFormData({ ...formData, parcelas: e.target.value })}
                required
              />
            </div>
            <div style={{ width: '90px' }}>
              <Input
                label="Já Pagas"
                type="number"
                min="0"
                value={formData.parcelas_pagas}
                onChange={(e) => setFormData({ ...formData, parcelas_pagas: e.target.value })}
              />
            </div>
          </div>

          <div className="form-actions">
            <Button type="submit" icon={editingId ? Save : Plus}>
              {editingId ? 'Salvar Alterações' : 'Adicionar Gasto'}
            </Button>
            {editingId && (
              <Button variant="secondary" onClick={resetForm} icon={X}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      {loading ? (
        <p className="loading-text">Carregando...</p>
      ) : grupos.length === 0 ? (
        <Card>
          <p className="loading-text">Nenhum gasto da casa cadastrado.</p>
        </Card>
      ) : (
        <div className="dashboard-grid" style={{ alignItems: 'start' }}>
          {grupos.map((grupo) => {
            const isExpanded = !!expanded[grupo.categoria];
            return (
              <div className="glass-card" key={grupo.categoria} style={{ padding: '20px', marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div>
                    <h3 className="glass-card-title m-0">{grupo.categoria}</h3>
                    <p style={{ fontSize: FONT.sizes.sm, color: COLORS.textMuted, margin: '4px 0 0 0' }}>
                      {grupo.pendentes} {grupo.pendentes === 1 ? 'parcela pendente' : 'parcelas pendentes'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: FONT.sizes.xs, color: COLORS.textMuted }}>Custo no mês atual</div>
                    <div style={{ fontSize: '20px', fontWeight: FONT.weights.bold, color: grupo.pendentesMes > 0 ? COLORS.danger : COLORS.success }}>
                      {formatCurrency(grupo.totalMesAtual)}
                    </div>
                  </div>
                </div>

                {grupo.pendentes > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                    <button
                      onClick={() => handlePagarTudo(grupo)}
                      className="action-btn action-btn-edit"
                      title="Marcar todas as parcelas pendentes como pagas"
                      style={{ gap: '6px', width: 'auto', padding: '6px 10px', fontSize: FONT.sizes.sm }}
                    >
                      <CheckCheck size={14} />
                      Pagar Tudo
                    </button>
                  </div>
                )}

                <button
                  onClick={() => toggleExpanded(grupo.categoria)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    borderTop: `1px solid ${COLORS.border}`,
                    marginTop: '16px',
                    paddingTop: '12px',
                    cursor: 'pointer',
                    fontSize: FONT.sizes.sm,
                    fontWeight: FONT.weights.semibold,
                    color: COLORS.textSecondary,
                  }}
                >
                  <span>Ver detalhes ({grupo.itens.length})</span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isExpanded && (
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {grupo.itens.map((gasto) => {
                      const parcelasRestantes = Math.max(gasto.parcelas - gasto.parcela_atual, 0);
                      const atrasado = isAtrasado(gasto);
                      return (
                        <div
                          key={gasto.id}
                          style={{
                            padding: '12px',
                            background: COLORS.inputBg,
                            borderRadius: '12px',
                            border: `1px solid ${atrasado ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.03)'}`,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                            <div>
                              <div style={{ fontSize: FONT.sizes.sm, fontWeight: FONT.weights.semibold, color: COLORS.text }}>
                                {gasto.descricao}
                              </div>
                              <div style={{ fontSize: FONT.sizes.xs, color: COLORS.textMuted, marginTop: '2px' }}>
                                {gasto.categoria} · Vence em {formatDate(gasto.data_vencimento)}
                                {atrasado && <span style={{ color: COLORS.danger, fontWeight: FONT.weights.semibold }}> · Atrasado</span>}
                                {gasto.projetado && <span> · Próxima parcela projetada</span>}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: FONT.sizes.md, fontWeight: FONT.weights.bold, color: COLORS.text }}>
                                {formatCurrency(gasto.valor_mensal)}
                              </div>
                              <span className={`badge ${gasto.status_pago ? 'badge-success' : 'badge-danger'}`}>
                                {gasto.status_pago ? 'Pago' : 'Pendente'}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                            <div style={{ fontSize: FONT.sizes.xs, color: COLORS.textMuted }}>
                              Parcela {gasto.parcela_atual} de {gasto.parcelas}
                              {gasto.parcelas > 1 && (
                                <>
                                  {' · '}
                                  <strong style={{ color: corRestantes(parcelasRestantes, 'inherit'), fontWeight: FONT.weights.bold }}>
                                    {parcelasRestantes}
                                  </strong>
                                  {` restante${parcelasRestantes === 1 ? '' : 's'}`}
                                </>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {!gasto.status_pago && (
                                <button
                                  onClick={() => handlePagar(gasto)}
                                  className="action-btn action-btn-edit"
                                  title="Marcar como pago"
                                >
                                  <Check size={16} />
                                </button>
                              )}
                              {gasto.projetado && (
                                <span
                                  title="Próxima parcela já projetada para o mês seguinte"
                                  style={{ color: COLORS.textMuted, display: 'inline-flex', alignItems: 'center', padding: '6px' }}
                                >
                                  <RotateCcw size={14} />
                                </span>
                              )}
                              <button
                                onClick={() => handleEdit(gasto)}
                                className="action-btn action-btn-edit"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(gasto)}
                                className="action-btn action-btn-delete"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {resumoAberto && createPortal(
        <div
          onClick={() => setResumoAberto(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card"
            style={{ maxWidth: '520px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '24px', marginBottom: 0 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <h3 className="glass-card-title m-0">Resumo dos Gastos da Casa</h3>
                <p style={{ fontSize: FONT.sizes.sm, color: COLORS.textMuted, margin: '4px 0 0 0' }}>
                  {resumo.quantidade} parcela{resumo.quantidade === 1 ? '' : 's'} em aberto · emitido em{' '}
                  {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => setResumoAberto(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.textSecondary, padding: '4px' }}
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {resumo.categorias.length === 0 ? (
                <p style={{ fontSize: FONT.sizes.sm, color: COLORS.textMuted, margin: 0 }}>
                  Nenhuma parcela em aberto.
                </p>
              ) : (
                resumo.categorias.map((cat) => (
                  <div key={cat.categoria}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                        paddingBottom: '6px',
                        marginBottom: '8px',
                        borderBottom: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <span style={{ fontSize: FONT.sizes.sm, fontWeight: FONT.weights.semibold, color: COLORS.textAccent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {cat.categoria}
                      </span>
                      <span style={{ fontSize: FONT.sizes.base, fontWeight: FONT.weights.bold, color: COLORS.text }}>
                        {formatCurrency(cat.subtotal)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {cat.itens.map((g) => {
                        const restantes = Math.max(Number(g.parcelas) - Number(g.parcela_atual), 0);
                        return (
                          <div
                            key={g.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '10px 12px',
                              background: COLORS.inputBg,
                              borderRadius: '10px',
                              border: '1px solid rgba(255,255,255,0.04)',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: FONT.sizes.sm, fontWeight: FONT.weights.semibold, color: COLORS.text }}>
                                {g.descricao}
                              </div>
                              <div style={{ fontSize: FONT.sizes.xs, color: COLORS.textMuted, marginTop: '2px' }}>
                                {g.categoria} · Parcela {g.parcela_atual}/{g.parcelas} · Faltam:{' '}
                                <strong style={{ color: corRestantes(restantes, restantes > 0 ? COLORS.danger : COLORS.success) }}>
                                  {restantes}
                                </strong>
                                {' '}· Vence {formatDate(g.data_vencimento)}
                              </div>
                            </div>
                            <div style={{ fontSize: FONT.sizes.base, fontWeight: FONT.weights.bold, color: COLORS.text, whiteSpace: 'nowrap' }}>
                              {formatCurrency(g.valor_mensal)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                marginTop: '18px',
                paddingTop: '14px',
                borderTop: `1px solid ${COLORS.borderLight}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: FONT.sizes.sm, color: COLORS.textSecondary }}>Custo no mês atual</span>
                <span style={{ fontSize: FONT.sizes.base, fontWeight: FONT.weights.semibold, color: COLORS.text }}>
                  {formatCurrency(totais.custoMes)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: FONT.sizes.sm, color: COLORS.textSecondary, fontWeight: FONT.weights.semibold }}>
                  Total em aberto
                </span>
                <span style={{ fontSize: FONT.sizes.xl, fontWeight: FONT.weights.bold, color: COLORS.text }}>
                  {formatCurrency(resumo.total)}
                </span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HousePage;
