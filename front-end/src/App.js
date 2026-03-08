import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, DollarSign, CreditCard, Settings, TrendingUp } from 'lucide-react';

// ==================== CONFIGURAÇÃO & CONSTANTES ===================
const API_BASE_URL = 'http://localhost:3001/api';

const TRANSACTION_TYPES = {
  ENTRADA: 'ENTRADA',
  SAIDA: 'SAIDA'
};

const COLORS = {
  primary: '#10b981',
  primaryDark: '#059669',
  primaryLight: '#d1fae5',
  secondary: '#065f46',
  background: '#f0fdf4',
  cardBg: '#ffffff',
  text: '#064e3b',
  textLight: '#6b7280',
  border: '#d1d5db',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b'
};

// ==================== SERVIÇOS / API ====================
class ApiService {
  static async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Transactions
  static getTransactions() {
    return this.request('/transactions');
  }

  static createTransaction(data) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static updateTransaction(id, data) {
    return this.request(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static deleteTransaction(id) {
    return this.request(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }

  // Cards
  static getCards() {
    return this.request('/cards');
  }

  static createCard(data) {
    return this.request('/cards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static updateCard(id, data) {
    return this.request(`/cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static deleteCard(id) {
    return this.request(`/cards/${id}`, {
      method: 'DELETE',
    });
  }

  // Credit (Faturas)
  static getCredits() {
    return this.request('/credits');
  }

  static createCredit(data) {
    return this.request('/credits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static updateCredit(id, data) {
    return this.request(`/credits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static deleteCredit(id) {
    return this.request(`/credits/${id}`, {
      method: 'DELETE',
    });
  }

  // Categories
  static getCategories() {
    return this.request('/categories');
  }

  static createCategory(data) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static updateCategory(id, data) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static deleteCategory(id) {
    return this.request(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // Fixed Expenses
  static getFixedExpenses() {
    return this.request('/fixed-expenses');
  }

  static createFixedExpense(data) {
    return this.request('/fixed-expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static updateFixedExpense(id, data) {
    return this.request(`/fixed-expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static deleteFixedExpense(id) {
    return this.request(`/fixed-expenses/${id}`, {
      method: 'DELETE',
    });
  }

  // Investments
  static getInvestments() {
    return this.request('/investments');
  }

  static createInvestment(data) {
    return this.request('/investments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static updateInvestment(id, data) {
    return this.request(`/investments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static deleteInvestment(id) {
    return this.request(`/investments/${id}`, {
      method: 'DELETE',
    });
  }
}

// ==================== COMPONENTES UTILITÁRIOS ====================
const Button = ({ children, onClick, variant = 'primary', type = 'button', icon: Icon, ...props }) => {
  const styles = {
    primary: {
      backgroundColor: COLORS.primary,
      color: 'white',
      border: 'none',
    },
    secondary: {
      backgroundColor: 'white',
      color: COLORS.text,
      border: `1px solid ${COLORS.border}`,
    },
    danger: {
      backgroundColor: COLORS.danger,
      color: 'white',
      border: 'none',
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        ...styles[variant],
        padding: '10px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: '500',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        if (variant === 'primary') e.currentTarget.style.backgroundColor = COLORS.primaryDark;
        if (variant === 'secondary') e.currentTarget.style.backgroundColor = COLORS.background;
        if (variant === 'danger') e.currentTarget.style.backgroundColor = '#dc2626';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = styles[variant].backgroundColor;
      }}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

const Input = ({ label, error, ...props }) => (
  <div style={{ marginBottom: '16px' }}>
    {label && (
      <label style={{
        display: 'block',
        marginBottom: '6px',
        fontSize: '14px',
        fontWeight: '500',
        color: COLORS.text,
      }}>
        {label}
      </label>
    )}
    <input
      style={{
        width: '100%',
        padding: '10px 12px',
        border: `1px solid ${error ? COLORS.danger : COLORS.border}`,
        borderRadius: '8px',
        fontSize: '14px',
        boxSizing: 'border-box',
      }}
      {...props}
    />
    {error && (
      <span style={{ color: COLORS.danger, fontSize: '12px', marginTop: '4px', display: 'block' }}>
        {error}
      </span>
    )}
  </div>
);

const Select = ({ label, options, error, ...props }) => (
  <div style={{ marginBottom: '16px' }}>
    {label && (
      <label style={{
        display: 'block',
        marginBottom: '6px',
        fontSize: '14px',
        fontWeight: '500',
        color: COLORS.text,
      }}>
        {label}
      </label>
    )}
    <select
      style={{
        width: '100%',
        padding: '10px 12px',
        border: `1px solid ${error ? COLORS.danger : COLORS.border}`,
        borderRadius: '8px',
        fontSize: '14px',
        boxSizing: 'border-box',
        backgroundColor: 'white',
      }}
      {...props}
    >
      <option value="">Selecione...</option>
      {options.map((opt, idx) => (
        <option key={idx} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && (
      <span style={{ color: COLORS.danger, fontSize: '12px', marginTop: '4px', display: 'block' }}>
        {error}
      </span>
    )}
  </div>
);

const Card = ({ children, title, subtitle }) => (
  <div style={{
    backgroundColor: COLORS.cardBg,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '24px',
  }}>
    {title && (
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, color: COLORS.text, fontSize: '18px', fontWeight: '600' }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ margin: '4px 0 0', color: COLORS.textLight, fontSize: '13px' }}>
            {subtitle}
          </p>
        )}
      </div>
    )}
    {children}
  </div>
);

const Table = ({ columns, data, onEdit, onDelete }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ backgroundColor: COLORS.primaryLight }}>
          {columns.map((col, idx) => (
            <th key={idx} style={{
              padding: '12px',
              textAlign: 'left',
              fontSize: '13px',
              fontWeight: '600',
              color: COLORS.secondary,
              borderBottom: `2px solid ${COLORS.primary}`,
            }}>
              {col.header}
            </th>
          ))}
          {(onEdit || onDelete) && (
            <th style={{
              padding: '12px',
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: '600',
              color: COLORS.secondary,
              borderBottom: `2px solid ${COLORS.primary}`,
            }}>
              Ações
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length + 1} style={{
              padding: '32px',
              textAlign: 'center',
              color: COLORS.textLight,
              fontSize: '14px',
            }}>
              Nenhum registro encontrado
            </td>
          </tr>
        ) : (
          data.map((row, rowIdx) => (
            <tr key={rowIdx} style={{
              borderBottom: `1px solid ${COLORS.border}`,
              transition: 'background-color 0.2s',
            }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.background}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} style={{
                  padding: '12px',
                  fontSize: '14px',
                  color: COLORS.text,
                }}>
                  {col.render ? col.render(row) : row[col.field]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(row)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: COLORS.primary,
                          padding: '4px',
                        }}
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(row)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: COLORS.danger,
                          padding: '4px',
                        }}
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

// ==================== PÁGINAS ====================

// Página de Transações
const ITEMS_PER_PAGE = 15;

const TransactionsPage = ({ categories }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    DATA: new Date().toISOString().split('T')[0],
    TIPO: '',
    categoria_id: '',
    DESCRICAO: '',
    VALOR: '',
  });
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await ApiService.getTransactions();
      setTransactions(data);
      setCurrentPage(1);
      setLastUpdate(new Date());
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
    setFormData({
      DATA: new Date().toISOString().split('T')[0],
      TIPO: '',
      categoria_id: '',
      DESCRICAO: '',
      VALOR: '',
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
    {
      header: 'Tipo',
      field: 'TIPO',
      render: (row) => (
        <span style={{
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '500',
          backgroundColor: row.TIPO === 'ENTRADA' ? COLORS.primaryLight : '#fee2e2',
          color: row.TIPO === 'ENTRADA' ? COLORS.secondary : '#991b1b',
        }}>
          {row.TIPO}
        </span>
      )
    },
    { header: 'Descrição', field: 'DESCRICAO' },
    { header: 'Valor', field: 'VALOR', render: (row) => formatCurrency(row.VALOR) },
    { header: 'Categoria', field: 'categoria_nome' },
  ];

  return (
    <div>
      <Card title="Nova Transação" subtitle={editingId ? "Editando transação" : "Cadastre uma nova transação"}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <Button type="submit" icon={editingId ? Save : Plus}>
              {editingId ? 'Salvar Alterações' : 'Adicionar Transação'}
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
        title="Transações Cadastradas"
        subtitle={`Última atualização: ${lastUpdate.toLocaleString('pt-BR')}`}
      >
        {loading ? (
          <p style={{ textAlign: 'center', color: COLORS.textLight }}>Carregando...</p>
        ) : (() => {
          const totalPages = Math.max(1, Math.ceil(transactions.length / ITEMS_PER_PAGE));
          const paginated = transactions.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
          );
          return (
            <>
              <Table
                columns={columns}
                data={paginated}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '16px',
                  padding: '12px 0 0',
                  borderTop: `1px solid ${COLORS.border}`,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '6px',
                    maxWidth: '100%',
                  }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: `1px solid ${COLORS.border}`,
                        background: currentPage === 1 ? COLORS.background : 'white',
                        color: currentPage === 1 ? COLORS.textLight : COLORS.text,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                      }}
                    >
                      ← Anterior
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: `1px solid ${page === currentPage ? COLORS.primary : COLORS.border}`,
                          background: page === currentPage ? COLORS.primary : 'white',
                          color: page === currentPage ? 'white' : COLORS.text,
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: page === currentPage ? '600' : '400',
                          flexShrink: 0,
                        }}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: `1px solid ${COLORS.border}`,
                        background: currentPage === totalPages ? COLORS.background : 'white',
                        color: currentPage === totalPages ? COLORS.textLight : COLORS.text,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                      }}
                    >
                      Próximo →
                    </button>
                  </div>
                  <span style={{ fontSize: '13px', color: COLORS.textLight, textAlign: 'center' }}>
                    Exibindo {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, transactions.length)} de {transactions.length} registros
                  </span>
                </div>
              )}
            </>
          );
        })()}
      </Card>
    </div>
  );
};

// Página de Cartões
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

  return (
    <div>
      <Card title="Nova Fatura" subtitle={editingId ? "Editando fatura" : "Cadastre uma nova fatura de cartão"}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
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
          <p style={{ textAlign: 'center', color: COLORS.textLight }}>Carregando...</p>
        ) : (() => {
          const totalPages = Math.max(1, Math.ceil(credits.length / ITEMS_PER_PAGE));
          const paginated = credits.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
          );
          return (
            <>
              <Table
                columns={columns}
                data={paginated}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  marginTop: '16px',
                  padding: '12px 0 0',
                  borderTop: `1px solid ${COLORS.border}`,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '6px',
                    maxWidth: '100%',
                  }}>
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: `1px solid ${COLORS.border}`,
                        background: currentPage === 1 ? COLORS.background : 'white',
                        color: currentPage === 1 ? COLORS.textLight : COLORS.text,
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                      }}
                    >
                      ← Anterior
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          border: `1px solid ${page === currentPage ? COLORS.primary : COLORS.border}`,
                          background: page === currentPage ? COLORS.primary : 'white',
                          color: page === currentPage ? 'white' : COLORS.text,
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: page === currentPage ? '600' : '400',
                          flexShrink: 0,
                        }}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: `1px solid ${COLORS.border}`,
                        background: currentPage === totalPages ? COLORS.background : 'white',
                        color: currentPage === totalPages ? COLORS.textLight : COLORS.text,
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                      }}
                    >
                      Próximo →
                    </button>
                  </div>
                  <span style={{ fontSize: '13px', color: COLORS.textLight, textAlign: 'center' }}>
                    Exibindo {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, credits.length)} de {credits.length} registros
                  </span>
                </div>
              )}
            </>
          );
        })()}
      </Card>
    </div>
  );
};

// Página de Configurações
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

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        borderBottom: `2px solid ${COLORS.border}`,
        overflowX: 'auto',
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? `3px solid ${COLORS.primary}` : '3px solid transparent',
                color: activeTab === tab.id ? COLORS.primary : COLORS.textLight,
                fontWeight: activeTab === tab.id ? '600' : '400',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                transition: 'all 0.2s',
                marginBottom: '-2px',
              }}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
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
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
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
            {(() => {
              const totalPages = Math.max(1, Math.ceil(investments.length / ITEMS_PER_PAGE));
              const paginated = investments.slice(
                (investmentPage - 1) * ITEMS_PER_PAGE,
                investmentPage * ITEMS_PER_PAGE
              );
              return (
                <>
                  <Table
                    columns={[
                      { header: 'Data', field: 'DATA', render: (row) => formatDate(row.DATA) },
                      { header: 'Categoria', field: 'CATEGORIA' },
                      { header: 'Valor Investido', field: 'VALOR', render: (row) => formatCurrency(row.VALOR) },
                      { header: 'Rendimentos', field: 'RENDIMENTO', render: (row) => row.RENDIMENTO ? formatCurrency(row.RENDIMENTO) : '-' },
                    ]}
                    data={paginated}
                    onEdit={handleEditInvestment}
                    onDelete={handleDeleteInvestment}
                  />
                  {totalPages > 1 && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                      marginTop: '16px',
                      padding: '12px 0 0',
                      borderTop: `1px solid ${COLORS.border}`,
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: '6px',
                        maxWidth: '100%',
                      }}>
                        <button
                          onClick={() => setInvestmentPage(p => Math.max(1, p - 1))}
                          disabled={investmentPage === 1}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: `1px solid ${COLORS.border}`,
                            background: investmentPage === 1 ? COLORS.background : 'white',
                            color: investmentPage === 1 ? COLORS.textLight : COLORS.text,
                            cursor: investmentPage === 1 ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                          }}
                        >
                          ← Anterior
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setInvestmentPage(page)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: `1px solid ${page === investmentPage ? COLORS.primary : COLORS.border}`,
                              background: page === investmentPage ? COLORS.primary : 'white',
                              color: page === investmentPage ? 'white' : COLORS.text,
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: page === investmentPage ? '600' : '400',
                              flexShrink: 0,
                            }}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setInvestmentPage(p => Math.min(totalPages, p + 1))}
                          disabled={investmentPage === totalPages}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: `1px solid ${COLORS.border}`,
                            background: investmentPage === totalPages ? COLORS.background : 'white',
                            color: investmentPage === totalPages ? COLORS.textLight : COLORS.text,
                            cursor: investmentPage === totalPages ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                          }}
                        >
                          Próximo →
                        </button>
                      </div>
                      <span style={{ fontSize: '13px', color: COLORS.textLight, textAlign: 'center' }}>
                        Exibindo {(investmentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(investmentPage * ITEMS_PER_PAGE, investments.length)} de {investments.length} registros
                      </span>
                    </div>
                  )}
                </>
              );
            })()}
          </Card>
        </>
      )}
    </div>
  );
};

// ==================== APP PRINCIPAL ====================
const App = () => {
  const [currentPage, setCurrentPage] = useState('transactions');
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [categoriesData, cardsData] = await Promise.all([
        ApiService.getCategories(),
        ApiService.getCards(),
      ]);
      setCategories(categoriesData);
      setCards(cardsData);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const menuItems = [
    { id: 'transactions', label: 'Transações', icon: DollarSign },
    { id: 'cards', label: 'Cartões', icon: CreditCard },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: COLORS.background,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: COLORS.cardBg,
        borderBottom: `1px solid ${COLORS.border}`,
        padding: '16px 24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '700',
            color: COLORS.primary,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <DollarSign size={28} />
            FinanceControl
          </h1>
          <nav>
            <div style={{ display: 'flex', gap: '8px' }}>
              {menuItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    style={{
                      padding: '10px 16px',
                      backgroundColor: currentPage === item.id ? COLORS.primaryLight : 'transparent',
                      color: currentPage === item.id ? COLORS.secondary : COLORS.text,
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: currentPage === item.id ? '600' : '400',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage !== item.id) {
                        e.currentTarget.style.backgroundColor = COLORS.primaryLight;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== item.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px 24px',
      }}>
        {currentPage === 'transactions' && <TransactionsPage categories={categories} />}
        {currentPage === 'cards' && <CardsPage cards={cards} />}
        {currentPage === 'settings' && <SettingsPage onDataUpdate={loadInitialData} />}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        color: COLORS.textLight,
        fontSize: '13px',
      }}>
        <p style={{ margin: 0 }}>
          © 2025 FinanceControl - Sistema de Controle Financeiro Pessoal
        </p>
      </footer>
    </div>
  );
};

export default App;