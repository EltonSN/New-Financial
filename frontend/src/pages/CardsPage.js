import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Save, X } from 'lucide-react';
import ApiService from '../services/ApiService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Pagination from '../components/Pagination';
import Tag from '../components/ui/Tag';
import { COLORS } from '../constants/theme';

const ITEMS_PER_PAGE = 15;

const hoje = () => new Date().toISOString().split('T')[0];

// Fixa o dia no mês pedido, cortando no último dia quando o mês é mais curto
// (fechamento dia 31 vira 28/02). Mesma regra do `proximaDataLimite` da API.
const diaNoMes = (ano, mes, dia) => {
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  return new Date(ano, mes, Math.min(dia, ultimoDia));
};

// A fatura pertence ao mês da sua `DATA` — mesma âncora usada pelo dashboard para
// separar fatura do mês atual da do próximo.
const mesDaFatura = (row) => {
  const d = new Date(String(row.DATA).trim().split('T')[0] + 'T00:00:00');
  return isNaN(d.getTime()) ? null : { ano: d.getFullYear(), mes: d.getMonth() };
};

const CardsPage = ({ cards }) => {
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    DATA: hoje(),
    CARTAO: '',
    VALOR: '',
    PROXIMO: '',
  });

  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      const data = await ApiService.getCredits();
      setCredits(data);
      setCurrentPage(1);
    } catch (error) {
      alert('Erro ao carregar faturas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Na criação a data é sempre hoje — o mês da fatura é derivado dela, o
      // usuário só escolhe o cartão e os valores.
      const payload = editingId ? formData : { ...formData, DATA: hoje() };

      if (editingId) {
        await ApiService.updateCredit(editingId, payload);
      } else {
        await ApiService.createCredit(payload);
      }

      resetForm();
      loadCredits();
    } catch (error) {
      alert('Erro ao salvar fatura');
    }
  };

  const handleEdit = (credit) => {
    setEditingId(credit.ID);
    setFormData({
      DATA: credit.DATA ? String(credit.DATA).split('T')[0] : hoje(),
      CARTAO: credit.CARTAO,
      VALOR: credit.VALOR,
      PROXIMO: credit.PROXIMO || '',
    });
  };

  const handleDelete = async (credit) => {
    if (!window.confirm('Deseja realmente excluir esta fatura?')) return;

    try {
      await ApiService.deleteCredit(credit.ID);
      loadCredits();
    } catch (error) {
      alert('Erro ao excluir fatura');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      DATA: hoje(),
      CARTAO: '',
      VALOR: '',
      PROXIMO: '',
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDiaMes = (date) =>
    `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;

  // Fechamento e vencimento da fatura: os dias fixos vêm do cadastro do cartão
  // (`cards.fechamento_dia` / `cards.vencimento_dia`), ancorados no mês da fatura.
  // Quando o vencimento cai antes do fechamento, ele pertence ao mês seguinte.
  const calcularFechVenc = useCallback((row) => {
    const cadastro = cards.find((c) => c.nome === row.CARTAO);
    const fechamentoDia = Number(row.fechamento_dia ?? cadastro?.fechamento_dia) || null;
    const vencimentoDia = Number(row.vencimento_dia ?? cadastro?.vencimento_dia) || null;
    if (!fechamentoDia && !vencimentoDia) return null;

    const base = new Date(String(row.DATA).trim().split('T')[0] + 'T00:00:00');
    if (isNaN(base.getTime())) return null;
    const ano = base.getFullYear();
    const mes = base.getMonth();

    const fechamento = fechamentoDia ? diaNoMes(ano, mes, fechamentoDia) : null;
    let vencimento = vencimentoDia ? diaNoMes(ano, mes, vencimentoDia) : null;
    if (fechamento && vencimento && vencimento < fechamento) {
      vencimento = diaNoMes(ano, mes + 1, vencimentoDia);
    }

    return { fechamento, vencimento };
  }, [cards]);

  // A cor vem do cadastro do cartão (`cards.cor`), que o GET traz junto de cada
  // fatura. O fallback pelo nome cobre a fatura recém-criada antes do reload.
  const corDoCartao = useCallback(
    (nome, corDaLinha) =>
      corDaLinha || cards.find((c) => c.nome === nome)?.cor || COLORS.primary,
    [cards]
  );

  // Faturas do mês corrente ficam em destaque; as dos meses anteriores esmaecem.
  const mesCorrente = useMemo(() => {
    const agora = new Date();
    return { ano: agora.getFullYear(), mes: agora.getMonth() };
  }, []);

  const ehMesAtual = useCallback(
    (row) => {
      const ref = mesDaFatura(row);
      return !!ref && ref.ano === mesCorrente.ano && ref.mes === mesCorrente.mes;
    },
    [mesCorrente]
  );

  // `background` e `opacity` são as duas propriedades que o <tr> honra de forma
  // confiável com `border-collapse: collapse` — box-shadow no <tr> não pinta.
  const rowStyle = useCallback(
    (row) =>
      ehMesAtual(row) ? { background: COLORS.primaryLight } : { opacity: 0.5 },
    [ehMesAtual]
  );

  // "Última atualização" é o último registro feito nesta página (`credit.atualizado_em`),
  // não a hora em que a tela carregou.
  const ultimaAtualizacao = useMemo(() => {
    const timestamps = credits
      .map((c) => (c.atualizado_em ? new Date(c.atualizado_em) : null))
      .filter((d) => d && !isNaN(d.getTime()));
    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps.map((d) => d.getTime())));
  }, [credits]);

  const columns = [
    {
      header: 'Cartão',
      field: 'CARTAO',
      render: (row) => <Tag color={corDoCartao(row.CARTAO, row.cor)}>{row.CARTAO}</Tag>,
    },
    {
      header: 'Fatura Atual',
      field: 'VALOR',
      render: (row) => (
        <span style={{ fontWeight: ehMesAtual(row) ? 600 : 400 }}>
          {formatCurrency(row.VALOR)}
        </span>
      ),
    },
    { header: 'Próxima Fatura', field: 'PROXIMO', render: (row) => row.PROXIMO ? formatCurrency(row.PROXIMO) : '-' },
    {
      header: 'Fech./Venc.',
      field: 'fechamento_dia',
      render: (row) => {
        const datas = calcularFechVenc(row);
        if (!datas) {
          return (
            <span style={{ color: COLORS.textMuted }} title="Cartão sem dia de fechamento/vencimento cadastrado em Configurações">
              -
            </span>
          );
        }
        return (
          <span style={{ whiteSpace: 'nowrap' }}>
            {datas.fechamento ? formatDiaMes(datas.fechamento) : '-'}
            <span style={{ color: COLORS.textMuted, margin: '0 4px' }}>/</span>
            {datas.vencimento ? formatDiaMes(datas.vencimento) : '-'}
          </span>
        );
      },
    },
  ];

  const totalPages = Math.max(1, Math.ceil(credits.length / ITEMS_PER_PAGE));
  const paginated = credits.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Cartões</h1>
        <p className="page-subtitle">Gerencie suas faturas de cartão de crédito</p>
      </div>

      <Card title={editingId ? "Editar Fatura" : "Nova Fatura"} subtitle={editingId ? "Editando fatura" : "Selecione o cartão e informe os valores — fechamento e vencimento vêm do cadastro"}>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <Select
              label="Selecione o Cartão"
              value={formData.CARTAO}
              onChange={(e) => setFormData({ ...formData, CARTAO: e.target.value })}
              options={cards.map(c => ({ value: c.nome, label: c.nome }))}
              required
            />
            <Input
              label="Valor da Fatura Atual"
              type="number"
              step="0.01"
              value={formData.VALOR}
              onChange={(e) => setFormData({ ...formData, VALOR: e.target.value })}
              required
            />
            <Input
              label="Valor da Próxima Fatura"
              type="number"
              step="0.01"
              value={formData.PROXIMO}
              onChange={(e) => setFormData({ ...formData, PROXIMO: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <Button type="submit" icon={editingId ? Save : Plus}>
              {editingId ? 'Salvar Alterações' : 'Adicionar Fatura'}
            </Button>
            {editingId && (
              <Button variant="secondary" onClick={resetForm} icon={X}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card
        title="Faturas Cadastradas"
        subtitle={`Última atualização: ${ultimaAtualizacao ? ultimaAtualizacao.toLocaleString('pt-BR') : '-'}`}
      >
        {loading ? (
          <p className="loading-text">Carregando...</p>
        ) : (
          <>
            <Table
              columns={columns}
              data={paginated}
              onEdit={handleEdit}
              onDelete={handleDelete}
              rowStyle={rowStyle}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={credits.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default CardsPage;
