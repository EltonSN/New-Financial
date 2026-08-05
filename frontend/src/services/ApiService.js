// ==================== SERVIÇOS / API ====================

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? '/api'
  : 'http://localhost:3001/api';

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

  // Recurring Income (Receitas Recorrentes)
  static getRecurringIncomes() {
    return this.request('/recurring-income');
  }

  static createRecurringIncome(data) {
    return this.request('/recurring-income', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static updateRecurringIncome(id, data) {
    return this.request(`/recurring-income/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static deleteRecurringIncome(id) {
    return this.request(`/recurring-income/${id}`, {
      method: 'DELETE',
    });
  }

  // Dashboard
  static getDashboard() {
    return this.request('/dashboard');
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

export default ApiService;
