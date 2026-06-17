import React, { useState, useEffect } from 'react';
import { Plus, Save, X, CreditCard, DollarSign, TrendingUp } from 'lucide-react';
import ApiService from '../services/ApiService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 15;

const SettingsPage = ({ onDataUpdate }) => {
  const [activeTab, setActiveTab] = useState('cards');

  const [cards, setCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [investments, setInvestments] = useState([]);

  const [cardForm, setCardForm] = useState({ nome: '', vencimento_dia: '', limite_total: '' });
  const [categoryForm, setCategoryForm] = useState({ nome: '' });
  const [expenseForm, setExpenseForm] = useState({ DATA: new Date().toISOString().split('T')[0], DESPESA: '', VALOR: '' });
  const [investmentForm, setInvestmentForm] = useState({ DATA: new Date().toISOString().split('T')[0], CATEGORIA: '', VALOR: '', RENDIMENTO: '' });

  const [editingCard, setEditingCard] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [investmentPage, setInvestmentPage] = useState(1);

  const [lastUpdates, setLastUpdates] = useState({
    cards: new Date(),
    categories: new Date(),
    expenses: new Date(),
    investments: new Date(),
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    await Promise.all([
      loadCards(),
      loadCategories(),
      loadFixedExpenses(),
      loadInvestments(),
    ]);
  };

  const loadCards = async () => {
    try {
      const data = await ApiService.getCards();
      setCards(data);
      setLastUpdates(prev => ({ ...prev, cards: new Date() }));
      onDataUpdate && onDataUpdate();
    } catch (error) {
      alert('Erro ao carregar cartões');
    }
  };

  const loadCategories = async () => {
    try {
      const data = await ApiService.getCategories();
      setCategories(data);
      setLastUpdates(prev => ({ ...prev, categories: new Date() }));
      onDataUpdate && onDataUpdate();
    } catch (error) {
      alert('Erro ao carregar categorias');
    }
  };

  const loadFixedExpenses = async () => {
    try {
      const data = await ApiService.getFixedExpenses();
      setFixedExpenses(data);
      setLastUpdates(prev => ({ ...prev, expenses: new Date() }));
    } catch (error) {
      alert('Erro ao carregar despesas fixas');
    }
  };

  const loadInvestments = async () => {
    try {
      const data = await ApiService.getInvestments();
      setInvestments(data);
      setInvestmentPage(1);
      setLastUpdates(prev => ({ ...prev, investments: new Date() }));
    } catch (error) {
      alert('Erro ao carregar investimentos');
    }
  };

  // Handlers para Cartões
  const handleCardSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCard) {
        await ApiService.updateCard(editingCard, cardForm);
      } else {
        await ApiService.createCard(cardForm);
      }
      setCardForm({ nome: '', vencimento_dia: '', limite_total: '' });
      setEditingCard(null);
      loadCards();
    } catch (error) {
      alert('Erro ao salvar cartão');
    }
  };

  const handleEditCard = (card) => {
    setEditingCard(card.id);
    setCardForm({
      nome: card.nome,
      vencimento_dia: card.vencimento_dia,
      limite_total: card.limite_total,
    });
  };

  const handleDeleteCard = async (card) => {
    if (!window.confirm('Deseja realmente excluir este cartão?')) return;
    try {
      await ApiService.deleteCard(card.id);
      loadCards();
    } catch (error) {
      alert('Erro ao excluir cartão');
    }
  };

  // Handlers para Categorias
  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await ApiService.updateCategory(editingCategory, categoryForm);
      } else {
        await ApiService.createCategory(categoryForm);
      }
      setCategoryForm({ nome: '' });
      setEditingCategory(null);
      loadCategories();
    } catch (error) {
      alert('Erro ao salvar categoria');
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category.id);
    setCategoryForm({ nome: category.nome });
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm('Deseja realmente excluir esta categoria?')) return;
    try {
      await ApiService.deleteCategory(category.id);
      loadCategories();
    } catch (error) {
      alert('Erro ao excluir categoria');
    }
  };

  // Handlers para Despesas Fixas
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingExpense) {
        await ApiService.updateFixedExpense(editingExpense, expenseForm);
      } else {
        await ApiService.createFixedExpense(expenseForm);
      }
      setExpenseForm({ DATA: new Date().toISOString().split('T')[0], DESPESA: '', VALOR: '' });
      setEditingExpense(null);
      loadFixedExpenses();
    } catch (error) {
      alert('Erro ao salvar despesa fixa');
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense.ID);
    setExpenseForm({
      DATA: expense.DATA ? String(expense.DATA).split('T')[0] : '',
      DESPESA: expense.DESPESA,
      VALOR: expense.VALOR,
    });
  };

  const handleDeleteExpense = async (expense) => {
    if (!window.confirm('Deseja realmente excluir esta despesa?')) return;
    try {
      await ApiService.deleteFixedExpense(expense.ID);
      loadFixedExpenses();
    } catch (error) {
      alert('Erro ao excluir despesa');
    }
  };

  // Handlers para Investimentos
  const handleInvestmentSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingInvestment) {
        await ApiService.updateInvestment(editingInvestment, investmentForm);
      } else {
        await ApiService.createInvestment(investmentForm);
      }
      setInvestmentForm({ DATA: new Date().toISOString().split('T')[0], CATEGORIA: '', VALOR: '', RENDIMENTO: '' });
      setEditingInvestment(null);
      loadInvestments();
    } catch (error) {
      alert('Erro ao salvar investimento');
    }
  };

  const handleEditInvestment = (investment) => {
    setEditingInvestment(investment.ID);
    setInvestmentForm({
      DATA: investment.DATA ? String(investment.DATA).split('T')[0] : '',
      CATEGORIA: investment.CATEGORIA,
      VALOR: investment.VALOR,
      RENDIMENTO: investment.RENDIMENTO || '',
    });
  };

  const handleDeleteInvestment = async (investment) => {
    if (!window.confirm('Deseja realmente excluir este investimento?')) return;
    try {
      await ApiService.deleteInvestment(investment.ID);
      loadInvestments();
    } catch (error) {
      alert('Erro ao excluir investimento');
    }
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

  const tabs = [
    { id: 'cards', label: 'Cartões', icon: CreditCard },
    { id: 'categories', label: 'Categorias', icon: DollarSign },
    { id: 'expenses', label: 'Despesas Fixas', icon: TrendingUp },
    { id: 'investments', label: 'Investimentos', icon: TrendingUp },
  ];

  const investmentTotalPages = Math.max(1, Math.ceil(investments.length / ITEMS_PER_PAGE));
  const investmentsPaginated = investments.slice(
    (investmentPage - 1) * ITEMS_PER_PAGE,
    investmentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Configurações</h1>
        <p className="page-subtitle">Gerencie cartões, categorias, despesas e investimentos</p>
      </div>

      <div className="tabs-container">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'cards' && (
        <>
          <Card title="Cadastro de Cartões">
            <form onSubmit={handleCardSubmit}>
              <div className="form-grid">
                <Input
                  label="Nome do Cartão"
                  type="text"
                  value={cardForm.nome}
                  onChange={(e) => setCardForm({ ...cardForm, nome: e.target.value })}
                  required
                />
                <Input
                  label="Dia do Vencimento"
                  type="number"
                  min="1"
                  max="31"
                  value={cardForm.vencimento_dia}
                  onChange={(e) => setCardForm({ ...cardForm, vencimento_dia: e.target.value })}
                  required
                />
                <Input
                  label="Limite Total"
                  type="number"
                  step="0.01"
                  value={cardForm.limite_total}
                  onChange={(e) => setCardForm({ ...cardForm, limite_total: e.target.value })}
                  required
                />
              </div>
              <div className="form-actions">
                <Button type="submit" icon={editingCard ? Save : Plus}>
                  {editingCard ? 'Salvar Alterações' : 'Adicionar Cartão'}
                </Button>
                {editingCard && (
                  <Button variant="secondary" onClick={() => {
                    setEditingCard(null);
                    setCardForm({ nome: '', vencimento_dia: '', limite_total: '' });
                  }} icon={X}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </Card>

          <Card title="Cartões Cadastrados" subtitle={`Última atualização: ${lastUpdates.cards.toLocaleString('pt-BR')}`}>
            <Table
              columns={[
                { header: 'Nome', field: 'nome' },
                { header: 'Vencimento', field: 'vencimento_dia', render: (row) => `Dia ${row.vencimento_dia}` },
                { header: 'Limite Total', field: 'limite_total', render: (row) => formatCurrency(row.limite_total) },
              ]}
              data={cards}
              onEdit={handleEditCard}
              onDelete={handleDeleteCard}
            />
          </Card>
        </>
      )}

      {activeTab === 'categories' && (
        <>
          <Card title="Cadastro de Categorias">
            <form onSubmit={handleCategorySubmit}>
              <Input
                label="Nome da Categoria"
                type="text"
                value={categoryForm.nome}
                onChange={(e) => setCategoryForm({ ...categoryForm, nome: e.target.value })}
                required
              />
              <div className="form-actions">
                <Button type="submit" icon={editingCategory ? Save : Plus}>
                  {editingCategory ? 'Salvar Alterações' : 'Adicionar Categoria'}
                </Button>
                {editingCategory && (
                  <Button variant="secondary" onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({ nome: '' });
                  }} icon={X}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </Card>

          <Card title="Categorias Cadastradas" subtitle={`Última atualização: ${lastUpdates.categories.toLocaleString('pt-BR')}`}>
            <Table
              columns={[
                { header: 'Nome', field: 'nome' },
              ]}
              data={categories}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
            />
          </Card>
        </>
      )}

      {activeTab === 'expenses' && (
        <>
          <Card title="Cadastro de Despesas Fixas">
            <form onSubmit={handleExpenseSubmit}>
              <div className="form-grid">
                <Input
                  label="Data"
                  type="date"
                  value={expenseForm.DATA}
                  onChange={(e) => setExpenseForm({ ...expenseForm, DATA: e.target.value })}
                  required
                />
                <Input
                  label="Nome da Despesa"
                  type="text"
                  value={expenseForm.DESPESA}
                  onChange={(e) => setExpenseForm({ ...expenseForm, DESPESA: e.target.value })}
                  required
                />
                <Input
                  label="Valor Mensal"
                  type="number"
                  step="0.01"
                  value={expenseForm.VALOR}
                  onChange={(e) => setExpenseForm({ ...expenseForm, VALOR: e.target.value })}
                  required
                />
              </div>
              <div className="form-actions">
                <Button type="submit" icon={editingExpense ? Save : Plus}>
                  {editingExpense ? 'Salvar Alterações' : 'Adicionar Despesa'}
                </Button>
                {editingExpense && (
                  <Button variant="secondary" onClick={() => {
                    setEditingExpense(null);
                    setExpenseForm({ DATA: new Date().toISOString().split('T')[0], DESPESA: '', VALOR: '' });
                  }} icon={X}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </Card>

          <Card title="Despesas Fixas Cadastradas" subtitle={`Última atualização: ${lastUpdates.expenses.toLocaleString('pt-BR')}`}>
            <Table
              columns={[
                { header: 'Data', field: 'DATA', render: (row) => formatDate(row.DATA) },
                { header: 'Despesa', field: 'DESPESA' },
                { header: 'Valor Mensal', field: 'VALOR', render: (row) => formatCurrency(row.VALOR) },
              ]}
              data={fixedExpenses}
              onEdit={handleEditExpense}
              onDelete={handleDeleteExpense}
            />
          </Card>
        </>
      )}

      {activeTab === 'investments' && (
        <>
          <Card title="Cadastro de Investimentos">
            <form onSubmit={handleInvestmentSubmit}>
              <div className="form-grid">
                <Input
                  label="Data do Investimento"
                  type="date"
                  value={investmentForm.DATA}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, DATA: e.target.value })}
                  required
                />
                <Input
                  label="Categoria"
                  type="text"
                  value={investmentForm.CATEGORIA}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, CATEGORIA: e.target.value })}
                  required
                />
                <Input
                  label="Valor Investido"
                  type="number"
                  step="0.01"
                  value={investmentForm.VALOR}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, VALOR: e.target.value })}
                  required
                />
                <Input
                  label="Rendimentos"
                  type="number"
                  step="0.01"
                  value={investmentForm.RENDIMENTO}
                  onChange={(e) => setInvestmentForm({ ...investmentForm, RENDIMENTO: e.target.value })}
                />
              </div>
              <div className="form-actions">
                <Button type="submit" icon={editingInvestment ? Save : Plus}>
                  {editingInvestment ? 'Salvar Alterações' : 'Adicionar Investimento'}
                </Button>
                {editingInvestment && (
                  <Button variant="secondary" onClick={() => {
                    setEditingInvestment(null);
                    setInvestmentForm({ DATA: new Date().toISOString().split('T')[0], CATEGORIA: '', VALOR: '', RENDIMENTO: '' });
                  }} icon={X}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </Card>

          <Card title="Investimentos Cadastrados" subtitle={`Última atualização: ${lastUpdates.investments.toLocaleString('pt-BR')}`}>
            <Table
              columns={[
                { header: 'Data', field: 'DATA', render: (row) => formatDate(row.DATA) },
                { header: 'Categoria', field: 'CATEGORIA' },
                { header: 'Valor Investido', field: 'VALOR', render: (row) => formatCurrency(row.VALOR) },
                { header: 'Rendimentos', field: 'RENDIMENTO', render: (row) => row.RENDIMENTO ? formatCurrency(row.RENDIMENTO) : '-' },
              ]}
              data={investmentsPaginated}
              onEdit={handleEditInvestment}
              onDelete={handleDeleteInvestment}
            />
            <Pagination
              currentPage={investmentPage}
              totalPages={investmentTotalPages}
              onPageChange={setInvestmentPage}
              totalItems={investments.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default SettingsPage;
