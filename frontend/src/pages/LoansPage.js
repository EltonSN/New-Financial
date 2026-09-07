import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Save, X, ChevronDown, ChevronUp, Check, CheckCheck, Edit2, Trash2, RotateCcw, FileText, Home } from 'lucide-react';
import ApiService from '../services/ApiService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { COLORS, FONT } from '../constants/theme';

// Divisão do custo da casa. O gasto inteiro é lançado na página Casa e metade
// dele é dívida da parceira, cadastrada aqui como este devedor. Espelha
// DEVEDOR_DIVISAO_CASA / DESCRICAO_DIVISAO_CASA / FRACAO_DIVISAO_CASA em
// api/routes/dashboard.js, que leva o mesmo valor para a Previsão de Saldo —
// mudar a regra aqui obriga a mudar lá.
const DEVEDOR_DIVISAO_CASA = 'Amor';
const DESCRICAO_DIVISAO_CASA = 'Div. Casa';
const FRACAO_DIVISAO_CASA = 0.5;

// Chave da corrente de parcelas: mesma dívida = mesmo devedor + mesma descrição.
// Espelha `chaveCorrente()` em api/routes/loans.js, que é quem edita e exclui a
// corrente inteira.
const chaveCorrente = (loan) =>
  `${String(loan.nome_devedor || '').trim().toUpperCase()}||${String(loan.descricao || '').trim().toUpperCase()}`;

const eDevedorDaCasa = (nome) =>
  String(nome || '').trim().toUpperCase() === DEVEDOR_DIVISAO_CASA.toUpperCase();

const emptyForm = {
  nome_devedor: '',
  descricao: '',
  valor: '',
  parcelas: 1,
  parcelas_pagas: 0,
  // Guardado só para preservar o contador de mês de uma dívida fixa na edição —
  // não tem campo no formulário. Ver `handleSubmit`.
  parcela_atual: 1,
  data_limite: new Date().toISOString().split('T')[0],
  is_fixo: false,
};

const LoansPage = () => {
  const [loans, setLoans] = useState([]);
  const [gastosCasa, setGastosCasa] = useState([]);
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
      // Os gastos da casa entram nesta tela porque metade deles é dívida da
      // parceira (ver `divisaoCasa`): a lista dela depende das duas tabelas.
      const [loansData, casaData] = await Promise.all([
        ApiService.getLoans(),
        ApiService.getHouseExpenses(),
      ]);
      setLoans(loansData);
      setGastosCasa(casaData);
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
    // Numa dívida fixa `parcela_atual` é **contador de mês** (2/1, 3/1, …), não
    // índice de parcela. Derivar de "Já Pagas" com clamp em `parcelas` zerava o
    // contador na edição (2 → 1), fazendo a linha colidir com a parcela que já
    // existia na corrente e a virada de mês criar a seguinte de novo — a dívida
    // duplicava ao salvar. Fixa preserva o valor da linha; parcelada continua
    // recalculando pelo formulário.
    const parcelaAtual = formData.is_fixo
      ? (editingId ? Number(formData.parcela_atual) || 1 : 1)
      : Math.min(Number(formData.parcelas_pagas || 0) + 1, parcelas);
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
      parcela_atual: loan.parcela_atual || 1,
      data_limite: loan.data_limite ? String(loan.data_limite).split('T')[0] : '',
      is_fixo: !!loan.is_fixo,
    });
  };

  // A API exclui a corrente inteira, não só a linha visível — apagar uma parcela
  // só faz a anterior voltar a ser a cabeça e reaparecer (e, numa dívida fixa,
  // gerar a parcela seguinte de novo). Por isso o aviso diz quantas linhas vão
  // embora, incluindo as já pagas.
  const handleDelete = async (loan) => {
    const naCorrente = loans.filter((l) => chaveCorrente(l) === chaveCorrente(loan)).length;
    const aviso = naCorrente > 1
      ? `Excluir "${loan.descricao}" de ${loan.nome_devedor}?\n\nIsso remove as ${naCorrente} parcelas dessa dívida, incluindo as já pagas.`
      : `Deseja realmente excluir esta dívida de ${loan.nome_devedor}?`;
    if (!window.confirm(aviso)) return;
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
    // Só o que é cobrança deste mês (incluindo atrasados): quitar uma parcela já
    // projetada para o mês que vem adiantaria a corrente inteira sem necessidade.
    const pendentes = grupo.todos.filter((l) => !l.status_pago && contaNoMesAtual(l));
    if (pendentes.length === 0) return;
    if (!window.confirm(`Marcar as ${pendentes.length} dívida(s) pendente(s) deste mês de ${grupo.nomeDevedor} como pagas?`)) return;
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

  const isMesPassado = (date) => {
    const d = parseData(date);
    if (!d) return false;
    const hoje = new Date();
    return d.getFullYear() < hoje.getFullYear()
      || (d.getFullYear() === hoje.getFullYear() && d.getMonth() < hoje.getMonth());
  };

  const isMesFuturo = (date) => {
    const d = parseData(date);
    if (!d) return false;
    const hoje = new Date();
    return d.getFullYear() > hoje.getFullYear()
      || (d.getFullYear() === hoje.getFullYear() && d.getMonth() > hoje.getMonth());
  };

  // O que a dívida representa para o mês corrente: as parcelas que vencem neste
  // mês mais as pendências que transbordaram dos meses anteriores — parcela
  // atrasada continua sendo dívida de agora e não pode sumir do resumo. Parcela
  // já paga em mês passado, essa sim, fica fora.
  const contaNoMesAtual = (loan) => isMesAtual(loan.data_limite)
    || (!loan.status_pago && isMesPassado(loan.data_limite));

  const isAtrasado = (loan) => {
    if (loan.status_pago) return false;
    const str = String(loan.data_limite).trim().split('T')[0];
    const d = new Date(str + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return d < hoje;
  };

  // Metade do custo da casa é dívida da parceira: a página Casa registra a compra
  // inteira e ela devolve 50%. Esse valor NÃO existe como linha em `loan` — é
  // derivado de `house_expense` a cada carga, porque a casa muda de valor a cada
  // compra lançada e a cada virada de parcela, e espelhar essa corrente em `loan`
  // significaria sincronizar duas tabelas em toda escrita da página Casa.
  // A mesma conta roda em api/routes/dashboard.js (`montarDivisaoCasa`), que é
  // quem leva o valor para a Previsão de Saldo.
  const divisaoCasa = useMemo(() => {
    const metade = (valor) => Number(valor || 0) * FRACAO_DIVISAO_CASA;

    // Custo do mês: toda parcela que vence neste mês, paga ou não — o mesmo
    // número do totalizador "Custo Total da Casa" da página Casa.
    const custoMes = gastosCasa
      .filter((g) => isMesAtual(g.data_vencimento))
      .reduce((acc, g) => acc + Number(g.valor_mensal), 0);

    // Próximo mês: as parcelas já lançadas para lá mais as que só vão nascer
    // quando as pendências deste mês forem quitadas. Parte da cabeça de cada
    // corrente (descrição + categoria), mesma regra das devoluções em `totais`.
    const hoje = new Date();
    const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    const cabecas = new Map();
    gastosCasa.forEach((g) => {
      const chave = `${String(g.descricao || '').trim().toUpperCase()}||${String(g.categoria || 'Outros').trim().toUpperCase()}`;
      const atual = cabecas.get(chave);
      if (!atual || Number(g.parcela_atual) > Number(atual.parcela_atual)) {
        cabecas.set(chave, g);
      }
    });

    let custoProximoMes = gastosCasa
      .filter((g) => isProximoMes(g.data_vencimento))
      .reduce((acc, g) => acc + Number(g.valor_mensal), 0);

    cabecas.forEach((g) => {
      if (isProximoMes(g.data_vencimento)) return; // parcela já lançada, contada acima
      const d = parseData(g.data_vencimento);
      if (!d || d > fimMesAtual) return; // parcela de um mês mais à frente
      if (Number(g.parcela_atual) >= Number(g.parcelas)) return; // corrente encerrada
      custoProximoMes += Number(g.valor_mensal);
    });

    // Falta receber (total): metade de tudo que a casa ainda tem em aberto,
    // incluindo as parcelas futuras que ainda não foram projetadas.
    const restanteCasa = gastosCasa
      .filter((g) => !g.status_pago)
      .reduce((acc, g) => {
        const restantes = Math.max(Number(g.parcelas) - Number(g.parcela_atual) + 1, 1);
        return acc + Number(g.valor_mensal) * restantes;
      }, 0);

    return {
      custoCasaMes: custoMes,
      valorMes: metade(custoMes),
      valorProximoMes: metade(custoProximoMes),
      valorRestanteTotal: metade(restanteCasa),
    };
  }, [gastosCasa]);

  // A divisão da casa vira um item de dívida sintético, com `derivado` para as
  // telas não oferecerem ✓/editar/excluir num registro que não existe no banco.
  // A baixa dele é a mesma de qualquer devolução (ADR-0004): lançar uma transação
  // de ENTRADA com o nome do devedor. Por isso ele é sempre pendente aqui.
  const itemDivisaoCasa = useMemo(() => {
    if (!(divisaoCasa.valorMes > 0)) return null;
    return {
      id: 'divisao-casa',
      derivado: true,
      nome_devedor: DEVEDOR_DIVISAO_CASA,
      descricao: DESCRICAO_DIVISAO_CASA,
      valor: divisaoCasa.valorMes,
      status_pago: 0,
      is_fixo: 1,
      parcelas: 1,
      parcela_atual: 1,
      data_limite: null,
      visivel: true,
      projetado: false,
    };
  }, [divisaoCasa]);

  // Cada parcela é uma linha própria, então ao quitar a parcela do mês a API já
  // cria a seguinte — o que faria a mesma dívida aparecer duas vezes na lista
  // (uma "Pago" e uma "Pendente" do mês que vem). Aqui montamos as "correntes"
  // de parcelas (mesmo devedor + mesma descrição, parcela_atual sequencial) e
  // mantemos visível apenas uma linha por corrente:
  //   - a parcela pendente, quando o mês dela já chegou (ou está atrasada);
  //   - senão a última parcela paga, marcada com `projetado` para indicar que a
  //     próxima já está agendada para o mês seguinte.
  // Mesma regra da página Casa — as duas telas são a mesma corrente de parcelas.
  const loansProcessados = useMemo(() => {
    const chaveDe = chaveCorrente;
    const porChave = {};
    loans.forEach((l) => {
      const chave = chaveDe(l);
      if (!porChave[chave]) porChave[chave] = [];
      porChave[chave].push(l);
    });

    const vizinho = (l, offset) => (porChave[chaveDe(l)] || [])
      .find((o) => Number(o.parcela_atual) === Number(l.parcela_atual) + offset);

    const visiveis = new Set();
    loans.forEach((l) => {
      if (l.status_pago) return;
      const anterior = vizinho(l, -1);
      // parcela futura que só existe porque a anterior foi quitada: fica oculta
      if (anterior && anterior.status_pago && isMesFuturo(l.data_limite)) return;
      visiveis.add(l.id);
    });
    loans.forEach((l) => {
      if (!l.status_pago) return;
      const proxima = vizinho(l, 1);
      // a próxima parcela já assumiu o lugar desta na lista
      if (proxima && visiveis.has(proxima.id)) return;
      visiveis.add(l.id);
    });

    return loans.map((l) => ({
      ...l,
      visivel: visiveis.has(l.id),
      projetado: !!(l.status_pago && vizinho(l, 1)),
    }));
  }, [loans]);

  const grupos = useMemo(() => {
    const porDevedor = {};
    loansProcessados.forEach((loan) => {
      if (!porDevedor[loan.nome_devedor]) {
        porDevedor[loan.nome_devedor] = [];
      }
      porDevedor[loan.nome_devedor].push(loan);
    });

    // O devedor da casa aparece mesmo sem nenhuma linha em `loan`: a divisão da
    // casa é dívida dele por si só.
    if (itemDivisaoCasa) {
      const existente = Object.keys(porDevedor).find(eDevedorDaCasa);
      if (!existente) porDevedor[DEVEDOR_DIVISAO_CASA] = [];
    }

    return Object.entries(porDevedor)
      .map(([nomeDevedor, todos]) => {
        // Itens sintéticos do grupo (hoje só a divisão da casa). Ficam fora de
        // `todos` de propósito: `todos` é o que existe no banco e é o que as
        // ações em lote podem tocar.
        const derivados = itemDivisaoCasa && eDevedorDaCasa(nomeDevedor) ? [itemDivisaoCasa] : [];
        const totalMesAtual = todos
          .filter((l) => !l.status_pago && contaNoMesAtual(l))
          .reduce((acc, l) => acc + Number(l.valor), 0)
          + derivados.reduce((acc, d) => acc + Number(d.valor), 0);
        const pendentes = todos.filter((l) => !l.status_pago).length + derivados.length;
        const itens = [...derivados, ...todos.filter((l) => l.visivel)];

        return { nomeDevedor, itens, todos, derivados, totalMesAtual, pendentes };
      })
      .sort((a, b) => a.nomeDevedor.localeCompare(b.nomeDevedor));
  }, [loansProcessados, itemDivisaoCasa]);

  const totais = useMemo(() => {
    const doMes = loans.filter(contaNoMesAtual);
    const hoje = new Date();
    const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    // Previsão do próximo mês = parcelas pendentes já lançadas para lá + projeção das
    // correntes que continuam ativas. Trabalha pela cabeça de cada corrente (mesmo
    // devedor + mesma descrição, parcela de maior número) e não só pelas pendentes:
    // uma dívida fixa ou parcelada já quitada neste mês também gera parcela no mês que
    // vem, mesmo que a linha da parcela seguinte ainda não exista no banco.
    const cabecas = new Map();
    loans.forEach((l) => {
      const chave = chaveCorrente(l);
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
      // A divisão da casa entra em todos os totalizadores: é dinheiro a receber
      // do mês como qualquer outra dívida, só que derivado de `house_expense`.
      totalMes: doMes.reduce((acc, l) => acc + Number(l.valor), 0) + divisaoCasa.valorMes,
      proximoMes: proximoMes + divisaoCasa.valorProximoMes,
      pagoMes: doMes.filter((l) => l.status_pago).reduce((acc, l) => acc + Number(l.valor), 0),
      pendenteMes: doMes.filter((l) => !l.status_pago).reduce((acc, l) => acc + Number(l.valor), 0)
        + divisaoCasa.valorMes,
      // Falta receber considerando as parcelas ainda não projetadas. Dívidas
      // fixas são perpétuas, então contam apenas a parcela em aberto.
      restanteTotal: loans
        .filter((l) => !l.status_pago)
        .reduce((acc, l) => {
          const restantes = l.is_fixo ? 1 : Math.max(Number(l.parcelas) - Number(l.parcela_atual) + 1, 1);
          return acc + Number(l.valor) * restantes;
        }, 0) + divisaoCasa.valorRestanteTotal,
    };
  }, [loans, divisaoCasa]);

  const grupoExtrato = extratoDevedor ? grupos.find((g) => g.nomeDevedor === extratoDevedor) : null;

  const extratoPendentes = useMemo(() => {
    if (!grupoExtrato) return [];
    const reais = [...grupoExtrato.todos]
      .filter((l) => !l.status_pago)
      .sort((a, b) => new Date(a.data_limite) - new Date(b.data_limite));
    // A divisão da casa vem primeiro: é o item de maior valor no mês e o único
    // que o devedor não consegue conferir na lista de dívidas cadastradas.
    return [...grupoExtrato.derivados, ...reais];
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
          {divisaoCasa.valorMes > 0 && (
            <div
              style={{ fontSize: FONT.sizes.xs, color: COLORS.textMuted, marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              title={`${Math.round(FRACAO_DIVISAO_CASA * 100)}% do custo da casa deste mês (${formatCurrency(divisaoCasa.custoCasaMes)}), cobrado de ${DEVEDOR_DIVISAO_CASA}`}
            >
              <Home size={11} />
              {`inclui ${DESCRICAO_DIVISAO_CASA} de ${DEVEDOR_DIVISAO_CASA}: ${formatCurrency(divisaoCasa.valorMes)}`}
            </div>
          )}
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
              title={`Parcelas já lançadas para o próximo mês, mais as fixas e as parceladas com parcela restante que serão geradas ao quitar as pendências deste mês${divisaoCasa.valorProximoMes > 0 ? `. Inclui ${DESCRICAO_DIVISAO_CASA}: ${formatCurrency(divisaoCasa.valorProximoMes)}` : ''}`}
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
            {/* Dívida fixa é cobrança mensal perpétua: não tem total de parcelas
                nem parcelas pagas, e `parcela_atual` é contador de mês. Mostrar
                os campos convidava a mexer no contador sem saber. */}
            {!formData.is_fixo && (
              <>
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
              </>
            )}
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
                  {grupo.todos.some((l) => !l.status_pago) && (
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
                                {loan.derivado ? (
                                  <span
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title={`${Math.round(FRACAO_DIVISAO_CASA * 100)}% do custo da casa deste mês (${formatCurrency(divisaoCasa.custoCasaMes)}). Some ao lançar uma transação de ENTRADA com a descrição "${loan.nome_devedor}".`}
                                  >
                                    <Home size={11} />
                                    Metade do custo da casa · automático
                                  </span>
                                ) : (
                                  <>
                                    Vence em {formatDate(loan.data_limite)}
                                    {atrasado && <span style={{ color: '#ef4444', fontWeight: 600 }}> · Atrasado</span>}
                                    {loan.is_fixo && <span> · Fixo</span>}
                                    {loan.projetado && <span> · Próxima parcela projetada</span>}
                                  </>
                                )}
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
                              {loan.derivado ? (
                                `Calculado da página Casa (${Math.round(FRACAO_DIVISAO_CASA * 100)}% de ${formatCurrency(divisaoCasa.custoCasaMes)})`
                              ) : loan.is_fixo ? (
                                'Cobrança mensal fixa'
                              ) : (
                                <>
                                  Parcela {loan.parcela_atual} de {loan.parcelas}
                                  {loan.parcelas > 1 && (
                                    <>
                                      {' · '}
                                      <strong style={{ color: corRestantes(parcelasRestantes, 'inherit'), fontWeight: FONT.weights.bold }}>
                                        {parcelasRestantes}
                                      </strong>
                                      {` restante${parcelasRestantes === 1 ? '' : 's'}`}
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                            {/* Item derivado não tem linha no banco: nada para quitar,
                                editar ou excluir aqui — muda na página Casa. */}
                            {!loan.derivado && (
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
                                {loan.projetado && (
                                  <span title="Próxima parcela já projetada para o mês seguinte" style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', padding: '6px' }}>
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
                            )}
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
                  const faltam = Math.max(l.parcelas - l.parcela_atual, 0);
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
                          {l.derivado ? (
                            <>
                              <strong style={{ color: COLORS.info }}>Casa</strong>
                              {` · ${Math.round(FRACAO_DIVISAO_CASA * 100)}% de ${formatCurrency(divisaoCasa.custoCasaMes)} · mensal`}
                            </>
                          ) : (
                            <>
                              {l.is_fixo ? (
                                <>
                                  <strong style={{ color: COLORS.warning }}>Fixo</strong> · mensal
                                </>
                              ) : (
                                <>
                                  Parcela {l.parcela_atual} de {l.parcelas} · Faltam:{' '}
                                  <strong style={{ color: corRestantes(faltam, COLORS.danger) }}>{faltam}</strong>
                                </>
                              )}
                              {' '}· Vence {formatDate(l.data_limite)}
                            </>
                          )}
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
