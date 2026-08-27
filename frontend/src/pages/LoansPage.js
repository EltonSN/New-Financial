import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Save, X, ChevronDown, ChevronUp, Check, CheckCheck, Edit2, Trash2, RotateCcw, FileText } from 'lucide-react';
import ApiService from '../services/ApiService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { COLORS, FONT } from '../constants/theme';

const emptyForm = {
  nome_devedor: '',
  descricao: '',
  valor: '',
  parcelas: 1,
  parcelas_pagas: 0,
  data_limite: new Date().toISOString().split('T')[0],
  is_fixo: false,
};

const LoansPage = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [expanded, setExpanded] = useState({});
  const [extratoDevedor, setExtratoDevedor] = useState(null);

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    try {
      const data = await ApiService.getLoans();
      setLoans(data);
    } catch (error) {
      alert('Erro ao carregar empréstimos');
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
      nome_devedor: formData.nome_devedor,
      descricao: formData.descricao,
      valor: formData.valor,
      parcelas,
      parcela_atual: parcelaAtual,
      data_limite: formData.data_limite,
      is_fixo: formData.is_fixo,
    };

    try {
      if (editingId) {
        await ApiService.updateLoan(editingId, payload);
        resetForm();
      } else {
        await ApiService.createLoan(payload);
        setFormData({
          ...emptyForm,
          nome_devedor: formData.nome_devedor,
          data_limite: formData.data_limite,
        });
      }
      loadLoans();
    } catch (error) {
      alert('Erro ao salvar empréstimo');
    }
  };

  const handleEdit = (loan) => {
    setEditingId(loan.id);
    setFormData({
      nome_devedor: loan.nome_devedor,
      descricao: loan.descricao || '',
      valor: loan.valor,
      parcelas: loan.parcelas,
      parcelas_pagas: Math.max((loan.parcela_atual || 1) - 1, 0),
      data_limite: loan.data_limite ? String(loan.data_limite).split('T')[0] : '',
      is_fixo: !!loan.is_fixo,
    });
  };

  const handleDelete = async (loan) => {
    if (!window.confirm(`Deseja realmente excluir esta dívida de ${loan.nome_devedor}?`)) return;
    try {
      await ApiService.deleteLoan(loan.id);
      loadLoans();
    } catch (error) {
      alert('Erro ao excluir empréstimo');
    }
  };

  const handlePagar = async (loan) => {
    try {
      await ApiService.payLoan(loan.id);
      loadLoans();
    } catch (error) {
      alert('Erro ao marcar empréstimo como pago');
    }
  };

  const handlePagarTudo = async (grupo) => {
    const pendentes = grupo.itens.filter((l) => !l.status_pago);
    if (pendentes.length === 0) return;
    if (!window.confirm(`Marcar as ${pendentes.length} dívida(s) pendente(s) de ${grupo.nomeDevedor} como pagas?`)) return;
    try {
      for (const loan of pendentes) {
        await ApiService.payLoan(loan.id);
      }
      loadLoans();
    } catch (error) {
      alert('Erro ao marcar dívidas como pagas');
    }
  };

  const toggleExpanded = (nomeDevedor) => {
    setExpanded((prev) => ({ ...prev, [nomeDevedor]: !prev[nomeDevedor] }));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

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

  const parseData = (date) => {
    if (!date) return null;
    const str = String(date).trim().split('T')[0];
    const d = new Date(str + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  };

  const isMesAtual = (date) => {
    const d = parseData(date);
    if (!d) return false;
    const hoje = new Date();
    return d.getFullYear() === hoje.getFullYear() && d.getMonth() === hoje.getMonth();
  };

  const isProximoMes = (date) => {
    const d = parseData(date);
    if (!d) return false;
    const hoje = new Date();
    const prox = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    return d.getFullYear() === prox.getFullYear() && d.getMonth() === prox.getMonth();
  };

  const isAtrasado = (loan) => {
    if (loan.status_pago) return false;
    const str = String(loan.data_limite).trim().split('T')[0];
    const d = new Date(str + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return d < hoje;
  };

  const grupos = useMemo(() => {
    const porDevedor = {};
    loans.forEach((loan) => {
      if (!porDevedor[loan.nome_devedor]) {
        porDevedor[loan.nome_devedor] = [];
      }
      porDevedor[loan.nome_devedor].push(loan);
    });

    return Object.entries(porDevedor)
      .map(([nomeDevedor, itens]) => {
        const totalMesAtual = itens
          .filter((l) => !l.status_pago && isMesAtual(l.data_limite))
          .reduce((acc, l) => acc + Number(l.valor), 0);
        const pendentes = itens.filter((l) => !l.status_pago).length;

        return { nomeDevedor, itens, totalMesAtual, pendentes };
      })
      .sort((a, b) => a.nomeDevedor.localeCompare(b.nomeDevedor));
  }, [loans]);

  const totais = useMemo(() => {
    const doMes = loans.filter((l) => isMesAtual(l.data_limite));
    const hoje = new Date();
    const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    // Previsão do próximo mês = parcelas pendentes já lançadas para lá + projeção das
    // correntes que continuam ativas. Trabalha pela cabeça de cada corrente (mesmo
    // devedor + mesma descrição, parcela de maior número) e não só pelas pendentes:
    // uma dívida fixa ou parcelada já quitada neste mês também gera parcela no mês que
    // vem, mesmo que a linha da parcela seguinte ainda não exista no banco.
    const cabecas = new Map();
    loans.forEach((l) => {
      const chave = `${String(l.nome_devedor || '').trim().toUpperCase()}||${String(l.descricao || '').trim().toUpperCase()}`;
      const atual = cabecas.get(chave);
      if (!atual || Number(l.parcela_atual) > Number(atual.parcela_atual)) {
        cabecas.set(chave, l);
      }
    });

    let proximoMes = loans
      .filter((l) => !l.status_pago && isProximoMes(l.data_limite))
      .reduce((acc, l) => acc + Number(l.valor), 0);

    cabecas.forEach((l) => {
      if (isProximoMes(l.data_limite)) return; // parcela já lançada, contada acima
      const d = parseData(l.data_limite);
      if (!d || d > fimMesAtual) return; // parcela de um mês mais à frente
      const geraProxima = l.is_fixo || Number(l.parcela_atual) < Number(l.parcelas);
      if (geraProxima) proximoMes += Number(l.valor);
    });

    return {
      totalMes: doMes.reduce((acc, l) => acc + Number(l.valor), 0),
      proximoMes,
      pagoMes: doMes.filter((l) => l.status_pago).reduce((acc, l) => acc + Number(l.valor), 0),
      pendenteMes: doMes.filter((l) => !l.status_pago).reduce((acc, l) => acc + Number(l.valor), 0),
      // Falta receber considerando as parcelas ainda não projetadas. Dívidas
      // fixas são perpétuas, então contam apenas a parcela em aberto.
      restanteTotal: loans
        .filter((l) => !l.status_pago)
        .reduce((acc, l) => {
          const restantes = l.is_fixo ? 1 : Math.max(Number(l.parcelas) - Number(l.parcela_atual) + 1, 1);
          return acc + Number(l.valor) * restantes;
        }, 0),
    };
  }, [loans]);

  const grupoExtrato = extratoDevedor ? grupos.find((g) => g.nomeDevedor === extratoDevedor) : null;

  const extratoPendentes = useMemo(() => {
    if (!grupoExtrato) return [];
    return [...grupoExtrato.itens]
      .filter((l) => !l.status_pago)
      .sort((a, b) => new Date(a.data_limite) - new Date(b.data_limite));
  }, [grupoExtrato]);

  const totalExtrato = extratoPendentes.reduce((acc, l) => acc + Number(l.valor), 0);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Empréstimos</h1>
        <p className="page-subtitle">Controle valores que outras pessoas devem a você</p>
      </div>

      {/* Totalizador em destaque */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: FONT.sizes.xs, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total a Receber · mês atual
          </div>
          <div style={{ fontSize: FONT.sizes.xxl, fontWeight: FONT.weights.bold, color: COLORS.text, lineHeight: 1.2 }}>
            {formatCurrency(totais.totalMes)}
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
            <div style={{ fontSize: FONT.sizes.xs, color: COLORS.textMuted }}>A receber no próximo mês</div>
            <div
              style={{ fontSize: FONT.sizes.lg, fontWeight: FONT.weights.bold, color: COLORS.info }}
              title="Parcelas já lançadas para o próximo mês, mais as fixas e as parceladas com parcela restante que serão geradas ao quitar as pendências deste mês"
            >
              {formatCurrency(totais.proximoMes)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: FONT.sizes.xs, color: COLORS.textMuted }}>Falta receber (total)</div>
            <div style={{ fontSize: FONT.sizes.lg, fontWeight: FONT.weights.bold, color: COLORS.warning }}>
              {formatCurrency(totais.restanteTotal)}
            </div>
          </div>
        </div>
      </div>

      <Card>
        <div style={{ marginBottom: '20px' }}>
          <h2 className="glass-card-title" style={{ marginBottom: '4px' }}>
            {editingId ? 'Editar Dívida' : 'Nova Dívida'}
          </h2>
          <p className="glass-card-subtitle" style={{ margin: 0 }}>
            {editingId ? 'Editando registro' : 'Cadastre rapidamente uma dívida de um devedor'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px' }}>
            <div style={{ flex: '2 1 180px' }}>
              <Input
                label="Nome do Devedor"
                value={formData.nome_devedor}
                onChange={(e) => setFormData({ ...formData, nome_devedor: e.target.value })}
                required
              />
            </div>
            <div style={{ flex: '2 1 180px' }}>
              <Input
                label="Descrição"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Motivo da dívida"
                required
              />
            </div>
            <div style={{ width: '150px' }}>
              <Input
                label="Data Limite"
                type="date"
                value={formData.data_limite}
                onChange={(e) => setFormData({ ...formData, data_limite: e.target.value })}
                required
              />
            </div>
            <div style={{ width: '110px' }}>
              <Input
                label="Valor"
                type="number"
                step="0.01"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
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
            <div style={{ paddingBottom: '12px' }}>
              <label className="dark-input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={formData.is_fixo}
                  onChange={(e) => setFormData({ ...formData, is_fixo: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#06b6d4' }}
                />
                Fixo
              </label>
            </div>
          </div>

          <div className="form-actions">
            <Button type="submit" icon={editingId ? Save : Plus}>
              {editingId ? 'Salvar Alterações' : 'Adicionar Dívida'}
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
          <p className="loading-text">Nenhum empréstimo cadastrado.</p>
        </Card>
      ) : (
        <div className="dashboard-grid" style={{ alignItems: 'start' }}>
          {grupos.map((grupo) => {
            const isExpanded = !!expanded[grupo.nomeDevedor];
            return (
              <div className="glass-card" key={grupo.nomeDevedor} style={{ padding: '20px', marginBottom: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div>
                    <h3 className="glass-card-title m-0">{grupo.nomeDevedor}</h3>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                      {grupo.pendentes} {grupo.pendentes === 1 ? 'pendência' : 'pendências'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Total pendente (mês atual)</div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: grupo.totalMesAtual > 0 ? '#ef4444' : '#22c55e' }}>
                      {formatCurrency(grupo.totalMesAtual)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                  <button
                    onClick={() => setExtratoDevedor(grupo.nomeDevedor)}
                    className="action-btn action-btn-edit"
                    title="Ver extrato simplificado"
                    style={{ gap: '6px', width: 'auto', padding: '6px 10px', fontSize: '12px' }}
                  >
                    <FileText size={14} />
                    Simplificado
                  </button>
                  {grupo.pendentes > 0 && (
                    <button
                      onClick={() => handlePagarTudo(grupo)}
                      className="action-btn action-btn-edit"
                      title="Marcar todas as pendências como pagas"
                      style={{ gap: '6px', width: 'auto', padding: '6px 10px', fontSize: '12px' }}
                    >
                      <CheckCheck size={14} />
                      Pagar Tudo
                    </button>
                  )}
                </div>

                <button
                  onClick={() => toggleExpanded(grupo.nomeDevedor)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    marginTop: '16px',
                    paddingTop: '12px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#94a3b8',
                  }}
                >
                  <span>Ver detalhes ({grupo.itens.length})</span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {isExpanded && (
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {grupo.itens.map((loan) => {
                      const parcelasRestantes = Math.max(loan.parcelas - loan.parcela_atual, 0);
                      const atrasado = isAtrasado(loan);
                      return (
                        <div
                          key={loan.id}
                          style={{
                            padding: '12px',
                            background: 'rgba(15, 23, 42, 0.3)',
                            borderRadius: '12px',
                            border: `1px solid ${atrasado ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.03)'}`,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{loan.descricao}</div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                Vence em {formatDate(loan.data_limite)}
                                {atrasado && <span style={{ color: '#ef4444', fontWeight: 600 }}> · Atrasado</span>}
                                {loan.is_fixo && <span> · Fixo</span>}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '15px', fontWeight: 700, color: '#e2e8f0' }}>
                                {formatCurrency(loan.valor)}
                              </div>
                              <span className={`badge ${loan.status_pago ? 'badge-success' : 'badge-danger'}`}>
                                {loan.status_pago ? 'Pago' : 'Pendente'}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              Parcela {loan.parcela_atual}/{loan.parcelas}
                              {loan.parcelas > 1 && (
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
                              {!loan.status_pago && (
                                <button
                                  onClick={() => handlePagar(loan)}
                                  className="action-btn action-btn-edit"
                                  title="Marcar como pago"
                                >
                                  <Check size={16} />
                                </button>
                              )}
                              {loan.status_pago && loan.is_fixo && (
                                <span title="Já projetado para o próximo mês" style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', padding: '6px' }}>
                                  <RotateCcw size={14} />
                                </span>
                              )}
                              <button
                                onClick={() => handleEdit(loan)}
                                className="action-btn action-btn-edit"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(loan)}
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

      {grupoExtrato && createPortal(
        <div
          onClick={() => setExtratoDevedor(null)}
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
            style={{ maxWidth: '480px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '24px', marginBottom: 0 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
              <div>
                <h3 className="glass-card-title m-0">{grupoExtrato.nomeDevedor}</h3>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Emitido em {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => setExtratoDevedor(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {extratoPendentes.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Nenhuma pendência para este devedor.</p>
              ) : (
                extratoPendentes.map((l) => {
                  const faltam = l.is_fixo ? 'Fixo' : Math.max(l.parcelas - l.parcela_atual, 0);
                  return (
                    <div
                      key={l.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        background: 'rgba(15, 23, 42, 0.3)',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{l.descricao}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Parcela {l.parcela_atual}/{l.parcelas} · Faltam:{' '}
                          <strong style={{ color: l.is_fixo ? COLORS.warning : corRestantes(faltam, COLORS.danger) }}>{faltam}</strong>
                          {' '}· Vence {formatDate(l.data_limite)}
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', whiteSpace: 'nowrap' }}>
                        {formatCurrency(l.valor)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '18px',
                paddingTop: '14px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Total a Pagar</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#e2e8f0' }}>{formatCurrency(totalExtrato)}</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default LoansPage;
