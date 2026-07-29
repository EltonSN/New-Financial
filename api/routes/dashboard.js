const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/dashboard — Dados agregados do dashboard
router.get('/', async (req, res) => {
  try {
    const [
      [saldoRows],
      [mesRows],
      [investRows],
      [dailyRows],
      [monthlyRows],
      [categoryRows],
      [lastTxRows],
      [cardsRows],
    ] = await Promise.all([
      // 1. Saldo Geral (acumulado total)
      db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN TIPO = 'ENTRADA' THEN VALOR ELSE 0 END), 0) as totalEntradas,
          COALESCE(SUM(CASE WHEN TIPO = 'SAIDA' THEN VALOR ELSE 0 END), 0) as totalSaidas
        FROM transactions
        WHERE YEAR(DATA) = YEAR(CURDATE()) AND MONTH(DATA) = MONTH(CURDATE())
      `),

      // 2. Entradas e Saídas do Mês Atual
      db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN TIPO = 'ENTRADA' THEN VALOR ELSE 0 END), 0) as entradas,
          COALESCE(SUM(CASE WHEN TIPO = 'SAIDA' THEN VALOR ELSE 0 END), 0) as saidas
        FROM transactions 
        WHERE YEAR(DATA) = YEAR(CURDATE()) AND MONTH(DATA) = MONTH(CURDATE())
      `),

      // 3. Investimentos — último valor de cada CATEGORIA
      db.query(`
        SELECT i1.CATEGORIA, i1.VALOR, i1.RENDIMENTO, i1.DATA
        FROM investment i1
        INNER JOIN (
          SELECT CATEGORIA, MAX(DATA) as max_data FROM investment GROUP BY CATEGORIA
        ) i2 ON i1.CATEGORIA = i2.CATEGORIA AND i1.DATA = i2.max_data
      `),

      // 4. Entradas vs Saídas — dia a dia no mês atual
      db.query(`
        SELECT 
          DAY(DATA) as dia,
          COALESCE(SUM(CASE WHEN TIPO = 'ENTRADA' THEN VALOR ELSE 0 END), 0) as entradas,
          COALESCE(SUM(CASE WHEN TIPO = 'SAIDA' THEN VALOR ELSE 0 END), 0) as saidas
        FROM transactions
        WHERE YEAR(DATA) = YEAR(CURDATE()) AND MONTH(DATA) = MONTH(CURDATE())
        GROUP BY DAY(DATA) 
        ORDER BY dia
      `),

      // 5. Entradas vs Saídas — mês a mês no ano atual
      db.query(`
        SELECT 
          MONTH(DATA) as mes,
          COALESCE(SUM(CASE WHEN TIPO = 'ENTRADA' THEN VALOR ELSE 0 END), 0) as entradas,
          COALESCE(SUM(CASE WHEN TIPO = 'SAIDA' THEN VALOR ELSE 0 END), 0) as saidas
        FROM transactions
        WHERE YEAR(DATA) = YEAR(CURDATE())
        GROUP BY MONTH(DATA) 
        ORDER BY mes
      `),

      // 6. Gastos por Categoria (mês atual, apenas SAIDA)
      db.query(`
        SELECT c.nome as categoria, SUM(t.VALOR) as total
        FROM transactions t
        LEFT JOIN categories c ON t.categoria_id = c.id
        WHERE t.TIPO = 'SAIDA' 
          AND YEAR(t.DATA) = YEAR(CURDATE()) 
          AND MONTH(t.DATA) = MONTH(CURDATE())
        GROUP BY c.nome 
        ORDER BY total DESC
      `),

      // 7. Últimas 7 transações
      db.query(`
        SELECT t.*, c.nome as categoria_nome 
        FROM transactions t 
        LEFT JOIN categories c ON t.categoria_id = c.id 
        ORDER BY t.DATA DESC, t.ID DESC 
        LIMIT 7
      `),

      // 8. Resumo dos Cartões (limite vs fatura mais recente)
      db.query(`
        SELECT cd.id, cd.nome, cd.limite_total, cd.vencimento_dia,
          COALESCE(cr.fatura_atual, 0) as fatura_atual
        FROM cards cd
        LEFT JOIN (
          SELECT c1.CARTAO, c1.VALOR as fatura_atual
          FROM credit c1
          INNER JOIN (
            SELECT CARTAO, MAX(DATA) as max_data FROM credit GROUP BY CARTAO
          ) c2 ON c1.CARTAO = c2.CARTAO AND c1.DATA = c2.max_data
        ) cr ON cd.nome = cr.CARTAO
      `),
    ]);

    const saldo = saldoRows[0] || { totalEntradas: 0, totalSaidas: 0 };
    const mes = mesRows[0] || { entradas: 0, saidas: 0 };

    res.json({
      saldoGeral: {
        totalEntradas: Number(saldo.totalEntradas),
        totalSaidas: Number(saldo.totalSaidas),
      },
      mesAtual: {
        entradas: Number(mes.entradas),
        saidas: Number(mes.saidas),
      },
      investimentos: investRows.map(i => ({
        categoria: i.CATEGORIA,
        valor: Number(i.VALOR),
        rendimento: Number(i.RENDIMENTO || 0),
        data: i.DATA,
      })),
      entradasVsSaidasDiario: dailyRows.map(r => ({
        dia: r.dia,
        entradas: Number(r.entradas),
        saidas: Number(r.saidas),
      })),
      entradasVsSaidasMensal: monthlyRows.map(r => ({
        mes: r.mes,
        entradas: Number(r.entradas),
        saidas: Number(r.saidas),
      })),
      gastosPorCategoria: categoryRows.map(r => ({
        categoria: r.categoria || 'Sem Categoria',
        total: Number(r.total),
      })),
      ultimasTransacoes: lastTxRows,
      resumoCartoes: cardsRows.map(r => ({
        id: r.id,
        nome: r.nome,
        limiteTotal: Number(r.limite_total),
        faturaAtual: Number(r.fatura_atual),
        vencimentoDia: r.vencimento_dia,
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
});

module.exports = router;
