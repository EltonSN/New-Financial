import React, { useState, useEffect } from 'react';
import { Plus, Save, X } from 'lucide-react';
import ApiService from '../services/ApiService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 15;

const CardsPage = ({ cards }) => {
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    DATA: new Date().toISOString().split('T')[0],
    CARTAO: '',
    VALOR: '',
    PARCELAS: '',
    PROXIMO: '',
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      const data = await ApiService.getCredits();
      setCredits(data);
      setCurrentPage(1);
      setLastUpdate(new Date());
    } catch (error) {
      alert('Erro ao carregar faturas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        await ApiService.updateCredit(editingId, formData);
      } else {
        await ApiService.createCredit(formData);
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
      DATA: credit.DATA ? String(credit.DATA).split('T')[0] : '',
      CARTAO: credit.CARTAO,
      VALOR: credit.VALOR,
      PARCELAS: credit.PARCELAS || '',
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
      DATA: new Date().toISOString().split('T')[0],
      CARTAO: '',
      VALOR: '',
      PARCELAS: '',
      PROXIMO: '',
    });
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
    { header: 'Cartão', field: 'CARTAO' },
    { header: 'Valor Atual', field: 'VALOR', render: (row) => formatCurrency(row.VALOR) },
    { header: 'Parcelas', field: 'PARCELAS', render: (row) => row.PARCELAS ? formatCurrency(row.PARCELAS) : '-' },
    { header: 'Próxima', field: 'PROXIMO', render: (row) => row.PROXIMO ? formatCurrency(row.PROXIMO) : '-' },
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

      <Card title={editingId ? "Editar Fatura" : "Nova Fatura"} subtitle={editingId ? "Editando fatura" : "Cadastre uma nova fatura de cartão"}>
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
              label="Nome do Cartão"
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
              label="Valor das Parcelas"
              type="number"
              step="0.01"
              value={formData.PARCELAS}
              onChange={(e) => setFormData({ ...formData, PARCELAS: e.target.value })}
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
        subtitle={`Última atualização: ${lastUpdate.toLocaleString('pt-BR')}`}
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
