const mysql = require('mysql2/promise');

// Criar pool de conexões usando mysql2/promise diretamente
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Testar conexão ao inicializar
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conectado ao MySQL com sucesso!');
    connection.release();
  } catch (err) {
    console.error('❌ Erro ao conectar ao MySQL:', err.message);
    console.error('   Host:', process.env.DB_HOST);
    console.error('   Database:', process.env.DB_NAME);
    console.error('   Port:', process.env.DB_PORT);
  }
})();

module.exports = pool;