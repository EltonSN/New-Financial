require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar rotas
const transactionsRoutes = require('./routes/transactions');
const cardsRoutes = require('./routes/cards');
const creditsRoutes = require('./routes/credits');
const categoriesRoutes = require('./routes/categories');
const fixedExpensesRoutes = require('./routes/fixedExpenses');
const investmentsRoutes = require('./routes/investments');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Rotas
app.use('/api/transactions', transactionsRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/fixed-expenses', fixedExpensesRoutes);
app.use('/api/investments', investmentsRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API está funcionando' });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'production' ? 'Erro no servidor' : err.message
  });
});

// Para desenvolvimento local
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 API disponível em http://localhost:${PORT}/api`);
  });
}

// Exportar para Vercel
module.exports = app;