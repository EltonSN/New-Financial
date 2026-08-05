const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ---------- Previsão de Saldo (mês atual e próximo) ----------

function getMonthRange(ano, mes) {
  const start = `${ano}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const end = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  return { ano, mes, start, end };
}

function proximoMes(ano, mes) {
  return mes === 12 ? { ano: ano + 1, mes: 1 } : { ano, mes: mes + 1 };
}

// Despesas fixas ativas, já iniciadas no período, cujo nome (DESPESA) NÃO tenha
// uma transação de SAIDA correspondente lançada no mesmo período (ou seja, ainda não pagas)
async function buscarDespesasFixasPendentes({ start, end }) {
  const [rows] = await db.query(
    `SELECT fe.ID, fe.DESPESA, fe.VALOR
     FROM fixed_expense fe
     WHERE fe.ATIVO = 1
       AND fe.DATA <= ?
       AND NOT EXISTS (
         SELECT 1 FROM transactions t
         WHERE t.TIPO = 'SAIDA'
           AND TRIM(UPPER(t.DESCRICAO)) = TRIM(UPPER(fe.DESPESA))
           AND t.DATA BETWEEN ? AND ?
       )`,
    [end, start, end]
  );
  return rows;
}

// Mesma lógica de deduplicação, para receitas recorrentes vs. transações de ENTRADA.
// Diferente das despesas fixas, nem toda receita recorrente deve se repetir todo mês:
// só o Salário é de fato mensal e recorrente — as demais (ex: "Devoluções - Ago",
// "Devoluções - Set") são lançamentos variáveis cadastrados um por mês, então só
// contam como pendentes no próprio mês em que foram cadastradas.
async function buscarReceitasRecorrentesPendentes({ ano, mes, start, end }) {
  const [rows] = await db.query(
    `SELECT ri.ID, ri.RECEITA, ri.VALOR
     FROM recurring_income ri
     WHERE ri.ATIVO = 1
       AND ri.DATA <= ?
       AND (
         TRIM(UPPER(ri.RECEITA)) = 'SALÁRIO'
         OR (YEAR(ri.DATA) = ? AND MONTH(ri.DATA) = ?)
       )
       AND NOT EXISTS (
         SELECT 1 FROM transactions t
         WHERE t.TIPO = 'ENTRADA'
           AND TRIM(UPPER(t.DESCRICAO)) = TRIM(UPPER(ri.RECEITA))
           AND t.DATA BETWEEN ? AND ?
       )`,
    [end, ano, mes, start, end]
  );
  return rows;
}

// Totais de transações avulsas do mês. Ignora lançamentos de BALANCEAMENTO — esses
// servem só para corrigir o Saldo Geral / Saldo Inicial, não são gasto ou receita real do mês.
async function buscarTotaisTransacoes({ start, end }) {
  const [rows] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN TIPO = 'ENTRADA' THEN VALOR ELSE 0 END), 0) as entradas,
       COALESCE(SUM(CASE WHEN TIPO = 'SAIDA' THEN VALOR ELSE 0 END), 0) as saidas
     FROM transactions
     WHERE DATA BETWEEN ? AND ?
       AND COALESCE(TRIM(UPPER(DESCRICAO)), '') != 'BALANCEAMENTO'`,
    [start, end]
  );
  return { entradas: Number(rows[0].entradas), saidas: Number(rows[0].saidas) };
}

// Faturas de cartão para o mês atual e o próximo. Usa o valor já lançado (VALOR) quando existe
// uma fatura cadastrada para aquele mês; senão, cai no valor projetado (PROXIMO) da fatura do mês atual.
async function buscarFaturaCartoes(mesAtualRange, mesProxRange) {
  const [rows] = await db.query(
    `SELECT CARTAO, VALOR, PROXIMO, YEAR(DATA) as ano, MONTH(DATA) as mes
     FROM credit
     WHERE DATA BETWEEN ? AND ?`,
    [mesAtualRange.start, mesProxRange.end]
  );

  const porCartao = {};
  const getCartao = (nome) => {
    if (!porCartao[nome]) {
      porCartao[nome] = { atual: 0, proximoProjetado: 0, proximoLancado: 0, temLancamentoProximo: false };
    }
    return porCartao[nome];
  };

  for (const row of rows) {
    const cartao = getCartao(row.CARTAO);
    if (row.ano === mesAtualRange.ano && row.mes === mesAtualRange.mes) {
      cartao.atual += Number(row.VALOR);
      cartao.proximoProjetado += Number(row.PROXIMO || 0);
    } else if (row.ano === mesProxRange.ano && row.mes === mesProxRange.mes) {
      cartao.temLancamentoProximo = true;
      cartao.proximoLancado += Number(row.VALOR);
    }
  }

  const totais = { atual: 0, proximo: 0 };
  const porCartaoLista = [];

  for (const [nome, c] of Object.entries(porCartao)) {
    const valorProximo = c.temLancamentoProximo ? c.proximoLancado : c.proximoProjetado;
    totais.atual += c.atual;
    totais.proximo += valorProximo;
    porCartaoLista.push({ cartao: nome, atual: c.atual, proximo: valorProximo });
  }

  return { ...totais, porCartao: porCartaoLista };
}

// Total atualmente aplicado em investimentos (último valor lançado por CATEGORIA).
// Esse dinheiro saiu do caixa disponível mas nunca é lançado como transação de SAÍDA,
// então precisa ser descontado do saldo acumulado para não inflar o saldo disponível.
async function buscarInvestimentosTotal() {
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(i1.VALOR), 0) as total
     FROM investment i1
     INNER JOIN (
       SELECT CATEGORIA, MAX(DATA) as max_data FROM investment GROUP BY CATEGORIA
     ) i2 ON i1.CATEGORIA = i2.CATEGORIA AND i1.DATA = i2.max_data`
  );
  return Number(rows[0].total);
}

async function calcularPrevisaoSaldo() {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtualNum = hoje.getMonth() + 1;
  const prox = proximoMes(anoAtual, mesAtualNum);

  const mesAtualRange = getMonthRange(anoAtual, mesAtualNum);
  const mesProxRange = getMonthRange(prox.ano, prox.mes);

  const [
    saldoAnteriorRows,
    despesasPendentesAtual,
    despesasPendentesProx,
    receitasPendentesAtual,
    receitasPendentesProx,
    totaisAtual,
    totaisProx,
    faturaCartoes,
    investimentosTotal,
  ] = await Promise.all([
    // Saldo acumulado antes do mês atual + qualquer lançamento de BALANCEAMENTO,
    // independente da data (é uma correção manual do saldo, não um fluxo do mês)
    db.query(
      `SELECT COALESCE(SUM(
         CASE
           WHEN COALESCE(TRIM(UPPER(DESCRICAO)), '') = 'BALANCEAMENTO'
             THEN (CASE WHEN TIPO = 'ENTRADA' THEN VALOR ELSE -VALOR END)
           WHEN DATA < ?
             THEN (CASE WHEN TIPO = 'ENTRADA' THEN VALOR ELSE -VALOR END)
           ELSE 0
         END
       ), 0) as saldo
       FROM transactions`,
      [mesAtualRange.start]
    ),
    buscarDespesasFixasPendentes(mesAtualRange),
    buscarDespesasFixasPendentes(mesProxRange),
    buscarReceitasRecorrentesPendentes(mesAtualRange),
    buscarReceitasRecorrentesPendentes(mesProxRange),
    buscarTotaisTransacoes(mesAtualRange),
    buscarTotaisTransacoes(mesProxRange),
    buscarFaturaCartoes(mesAtualRange, mesProxRange),
    buscarInvestimentosTotal(),
  ]);

  // Desconta o total aplicado em investimentos, já que essa saída de caixa nunca
  // é registrada como transação de SAÍDA (confirmado com o usuário)
  const saldoAnterior = Number(saldoAnteriorRows[0][0].saldo) - investimentosTotal;

  const montarMes = (range, despesasPendentes, receitasPendentes, totaisTransacoes, faturaMes, saldoInicial, faturasPorCartao) => {
    const totalDespesasFixasPendentes = despesasPendentes.reduce((acc, d) => acc + Number(d.VALOR), 0);
    const totalReceitasPendentes = receitasPendentes.reduce((acc, r) => acc + Number(r.VALOR), 0);

    const entradasPrevistas = totalReceitasPendentes + totaisTransacoes.entradas;
    const saidasPrevistas = totalDespesasFixasPendentes + faturaMes + totaisTransacoes.saidas;
    const saldoFinal = saldoInicial + entradasPrevistas - saidasPrevistas;

    return {
      ano: range.ano,
      mes: range.mes,
      saldoInicial,
      entradasPrevistas,
      saidasPrevistas,
      saldoFinal,
      detalhes: {
        despesasFixasPendentes: despesasPendentes.map(d => ({ id: d.ID, nome: d.DESPESA, valor: Number(d.VALOR) })),
        receitasRecorrentesPendentes: receitasPendentes.map(r => ({ id: r.ID, nome: r.RECEITA, valor: Number(r.VALOR) })),
        faturasCartao: faturasPorCartao.filter(f => f.valor > 0),
        transacoesEntradas: totaisTransacoes.entradas,
        transacoesSaidas: totaisTransacoes.saidas,
        faturaCartoes: faturaMes,
      },
    };
  };

  const mesAtualResultado = montarMes(
    mesAtualRange, despesasPendentesAtual, receitasPendentesAtual, totaisAtual, faturaCartoes.atual, saldoAnterior,
    faturaCartoes.porCartao.map(c => ({ nome: c.cartao, valor: c.atual }))
  );

  const proximoMesResultado = montarMes(
    mesProxRange, despesasPendentesProx, receitasPendentesProx, totaisProx, faturaCartoes.proximo, mesAtualResultado.saldoFinal,
    faturaCartoes.porCartao.map(c => ({ nome: c.cartao, valor: c.proximo }))
  );

  return { mesAtual: mesAtualResultado, proximoMes: proximoMesResultado };
}

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
      previsaoSaldo,
    ] = await Promise.all([
      // 1. Saldo Geral (acumulado de todo o histórico de transações, sem filtro de mês —
      //    representa o que restou dos meses anteriores + o que já entrou/saiu neste mês)
      db.query(`
        SELECT
          COALESCE(SUM(CASE WHEN TIPO = 'ENTRADA' THEN VALOR ELSE 0 END), 0) as totalEntradas,
          COALESCE(SUM(CASE WHEN TIPO = 'SAIDA' THEN VALOR ELSE 0 END), 0) as totalSaidas
        FROM transactions
      `),

      // 2. Entradas e Saídas do Mês Atual (ignora lançamentos de BALANCEAMENTO,
      //    que servem só para corrigir o Saldo Geral / Saldo Inicial da previsão)
      db.query(`
        SELECT
          COALESCE(SUM(CASE WHEN TIPO = 'ENTRADA' THEN VALOR ELSE 0 END), 0) as entradas,
          COALESCE(SUM(CASE WHEN TIPO = 'SAIDA' THEN VALOR ELSE 0 END), 0) as saidas
        FROM transactions
        WHERE YEAR(DATA) = YEAR(CURDATE()) AND MONTH(DATA) = MONTH(CURDATE())
          AND COALESCE(TRIM(UPPER(DESCRICAO)), '') != 'BALANCEAMENTO'
      `),

      // 3. Investimentos — último valor de cada CATEGORIA
      db.query(`
        SELECT i1.CATEGORIA, i1.VALOR, i1.RENDIMENTO, i1.DATA
        FROM investment i1
        INNER JOIN (
          SELECT CATEGORIA, MAX(DATA) as max_data FROM investment GROUP BY CATEGORIA
        ) i2 ON i1.CATEGORIA = i2.CATEGORIA AND i1.DATA = i2.max_data
      `),

      // 4. Entradas vs Saídas — dia a dia no mês atual (ignora BALANCEAMENTO)
      db.query(`
        SELECT
          DAY(DATA) as dia,
          COALESCE(SUM(CASE WHEN TIPO = 'ENTRADA' THEN VALOR ELSE 0 END), 0) as entradas,
          COALESCE(SUM(CASE WHEN TIPO = 'SAIDA' THEN VALOR ELSE 0 END), 0) as saidas
        FROM transactions
        WHERE YEAR(DATA) = YEAR(CURDATE()) AND MONTH(DATA) = MONTH(CURDATE())
          AND COALESCE(TRIM(UPPER(DESCRICAO)), '') != 'BALANCEAMENTO'
        GROUP BY DAY(DATA)
        ORDER BY dia
      `),

      // 5. Entradas vs Saídas — mês a mês no ano atual (ignora BALANCEAMENTO)
      db.query(`
        SELECT
          MONTH(DATA) as mes,
          COALESCE(SUM(CASE WHEN TIPO = 'ENTRADA' THEN VALOR ELSE 0 END), 0) as entradas,
          COALESCE(SUM(CASE WHEN TIPO = 'SAIDA' THEN VALOR ELSE 0 END), 0) as saidas
        FROM transactions
        WHERE YEAR(DATA) = YEAR(CURDATE())
          AND COALESCE(TRIM(UPPER(DESCRICAO)), '') != 'BALANCEAMENTO'
        GROUP BY MONTH(DATA)
        ORDER BY mes
      `),

      // 6. Gastos por Categoria (mês atual, apenas SAIDA, ignora BALANCEAMENTO)
      db.query(`
        SELECT c.nome as categoria, SUM(t.VALOR) as total
        FROM transactions t
        LEFT JOIN categories c ON t.categoria_id = c.id
        WHERE t.TIPO = 'SAIDA'
          AND YEAR(t.DATA) = YEAR(CURDATE())
          AND MONTH(t.DATA) = MONTH(CURDATE())
          AND COALESCE(TRIM(UPPER(t.DESCRICAO)), '') != 'BALANCEAMENTO'
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

      // 9. Previsão de Saldo — mês atual e próximo
      calcularPrevisaoSaldo(),
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
      previsaoSaldo,
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
});

module.exports = router;
