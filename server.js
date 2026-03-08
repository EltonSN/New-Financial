require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/database');

// Importar rotas
const transactionsRoutes = require('./routes/transactions');
const cardsRoutes = require('./routes/cards');
const creditsRoutes = require('./routes/credits');
const categoriesRoutes = require('./routes/categories');
const fixedExpensesRoutes = require('./routes/fixedExpenses');
const investmentsRoutes = require('./routes/investments');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

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
    message: err.message
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 API disponível em http://localhost:${PORT}/api`);
});

// Tratamento de shutdown gracioso
process.on('SIGINT', () => {
  console.log('\n⏸️  Encerrando servidor...');
  db.end((err) => {
    if (err) console.error('Erro ao fechar conexão:', err);
    console.log('✅ Conexão com banco de dados fechada');
    process.exit(0);
  });
});