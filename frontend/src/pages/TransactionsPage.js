import React, { useState, useEffect } from 'react';
import { Plus, Save, X } from 'lucide-react';
import ApiService from '../services/ApiService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Pagination from '../components/Pagination';

const TRANSACTION_TYPES = {
  ENTRADA: 'ENTRADA',
  SAIDA: 'SAIDA'
};

const ITEMS_PER_PAGE = 15;

const TransactionsPage = ({ categories }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [formData, setFormData] = useState({
    DATA: new Date().toISOString().split('T')[0],
    TIPO: '',
    categoria_id: '',
    DESCRICAO: '',
    VALOR: '',
  });
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterYear, filterMonth]);

  const loadTransactions = async () => {
    try {
      const data = await ApiService.getTransactions();
      setTransactions(data);
      setCurrentPage(1);
    } catch (error) {
      alert('Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        await ApiService.updateTransaction(editingId, formData);
      } else {
        await ApiService.createTransaction(formData);
      }

      resetForm();
      loadTransactions();
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      alert('Erro ao salvar transação');
    }
  };

  const handleEdit = (transaction) => {
    setEditingId(transaction.ID);
    setFormData({
      DATA: transaction.DATA ? String(transaction.DATA).split('T')[0] : '',
      TIPO: transaction.TIPO,
      categoria_id: transaction.categoria_id || '',
      DESCRICAO: transaction.DESCRICAO || '',
      VALOR: transaction.VALOR,
    });
  };

  const handleDelete = async (transaction) => {
    if (!window.confirm('Deseja realmente excluir esta transação?')) return;

    try {
      await ApiService.deleteTransaction(transaction.ID);
      loadTransactions();
    } catch (error) {
      alert('Erro ao excluir transação');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData(prev => ({
      DATA: prev.DATA,
      TIPO: prev.TIPO,
      categoria_id: prev.categoria_id,
      DESCRICAO: '',
      VALOR: '',
    }));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    const str = String(date).trim().split('T')[0];
    const d = new Date(str + 'T00:00:00');
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
  };

  const columns = [
    { header: 'Data', field: 'DATA', render: (row) => formatDate(row.DATA) },
    {
      header: 'Tipo',
      field: 'TIPO',
      render: (row) => (
        <span className={`badge ${row.TIPO === 'ENTRADA' ? 'badge-success' : 'badge-danger'}`}>
          {row.TIPO}
        </span>
      )
    },
    { header: 'Descrição', field: 'DESCRICAO' },
    {
      header: 'Valor',
      field: 'VALOR',
      render: (row) => (
        <span style={{
          color: row.TIPO === 'ENTRADA' ? '#10B981' : '#EF4444',
          fontWeight: '600',
        }}>
          {row.TIPO === 'ENTRADA' ? '+' : '-'}{formatCurrency(row.VALOR)}
        </span>
      )
    },
    { header: 'Categoria', field: 'categoria_nome' },
  ];

  const getLastInsertedDate = () => {
    if (!transactions || transactions.length === 0) return '-';
    let last = transactions[0];
    for (let i = 1; i < transactions.length; i++) {
        if (new Date(transactions[i].DATA) > new Date(last.DATA)) {
            last = transactions[i];
        }
    }
    return formatDate(last.DATA);
  };

  const years = Array.from(new Set(transactions.map(t => t.DATA ? String(t.DATA).substring(0, 4) : ''))).filter(Boolean).sort((a, b) => b - a);
  const yearOptions = years.map(y => ({ value: y, label: y }));
  const MONTHS = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  const filteredTransactions = transactions.filter((t) => {
    if (filterYear && t.DATA && !String(t.DATA).startsWith(filterYear)) return false;
    if (filterMonth && t.DATA) {
      const monthPart = String(t.DATA).length >= 7 ? String(t.DATA).substring(5, 7) : '';
      if (monthPart !== filterMonth) return false;
    }

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    
    if (t.DESCRICAO && t.DESCRICAO.toLowerCase().includes(term)) return true;
    if (t.VALOR && String(t.VALOR).includes(term)) return true;
    if (t.categoria_nome && t.categoria_nome.toLowerCase().includes(term)) return true;

    return false;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  const paginated = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Transações</h1>
        <p className="page-subtitle">Gerencie suas entradas e saídas</p>
      </div>

      <Card title={editingId ? "Editar Transação" : "Nova Transação"} subtitle={editingId ? "Editando transação" : "Cadastre uma nova transação"}>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <Input
              label="Data"
              type="date"
              value={formData.DATA}
              onChange={(e) => setFormData({ ...formData, DATA: e.target.value })}
              required
            />
            <Select
              label="Tipo"
              value={formData.TIPO}
              onChange={(e) => setFormData({ ...formData, TIPO: e.target.value })}
              options={Object.values(TRANSACTION_TYPES).map(t => ({ value: t, label: t }))}
              required
            />
            <Select
              label="Categoria"
              value={formData.categoria_id}
              onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
              options={categories.map(c => ({ value: c.id, label: c.nome }))}
              required
            />
            <Input
              label="Descrição"
              type="text"
              value={formData.DESCRICAO}
              onChange={(e) => setFormData({ ...formData, DESCRICAO: e.target.value })}
            />
            <Input
              label="Valor"
              type="number"
              step="0.01"
              value={formData.VALOR}
              onChange={(e) => setFormData({ ...formData, VALOR: e.target.value })}
              required
            />
          </div>
          <div className="form-actions" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <Button type="submit" icon={editingId ? Save : Plus}>
              {editingId ? 'Salvar Alterações' : 'Adicionar Transação'}
            </Button>
            {editingId && (
              <Button variant="secondary" onClick={resetForm} icon={X}>
                Cancelar
              </Button>
            )}
            {showSuccess && (
              <span style={{ color: '#10B981', fontWeight: '500', marginLeft: '0.5rem', animation: 'fadeIn 0.3s' }}>
                ✓ Transação salva!
              </span>
            )}
          </div>
        </form>
      </Card>

      <Card
        title="Transações Cadastradas"
        subtitle={`Última atualização: ${getLastInsertedDate()}`}
      >
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <Input
              type="text"
              placeholder="Buscar por descrição, valor ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ width: '160px' }}>
            <Select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              options={yearOptions}
              placeholder="Todos os Anos"
            />
          </div>
          <div style={{ width: '160px' }}>
            <Select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              options={MONTHS}
              placeholder="Todos os Meses"
            />
          </div>
        </div>
        
        {loading ? (
          <p className="loading-text">Carregando...</p>
        ) : (
          <>
            <Table
              columns={columns}
              data={paginated}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredTransactions.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default TransactionsPage;
