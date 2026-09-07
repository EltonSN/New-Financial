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

// Normaliza um nome para comparação com DESCRICAO de transação (trim + uppercase)
const normalizarNome = (nome) => String(nome || '').trim().toUpperCase();

// Despesas fixas ativas e já iniciadas no período, com a flag `pago` indicando se
// existe uma transação de SAIDA de mesmo nome (DESPESA) lançada no mesmo período.
// Retorna também as já pagas: o dashboard as exibe riscadas nos detalhes, mas só
// as pendentes entram no cálculo de saídas previstas.
async function buscarDespesasFixas({ start, end }) {
  const [rows] = await db.query(
    `SELECT fe.ID, fe.DESPESA, fe.VALOR,
       EXISTS (
         SELECT 1 FROM transactions t
         WHERE t.TIPO = 'SAIDA'
           AND TRIM(UPPER(t.DESCRICAO)) = TRIM(UPPER(fe.DESPESA))
           AND t.DATA BETWEEN ? AND ?
       ) AS pago
     FROM fixed_expense fe
     WHERE fe.ATIVO = 1
       AND fe.DATA <= ?
     ORDER BY pago ASC, fe.DESPESA ASC`,
    [start, end, end]
  );
  return rows;
}

// Mesma lógica de baixa por nome, para receitas recorrentes vs. transações de ENTRADA.
// Diferente das despesas fixas, nem toda receita recorrente deve se repetir todo mês:
// só o Salário é de fato mensal e recorrente — as demais (ex: "Devoluções - Ago",
// "Devoluções - Set") são lançamentos variáveis cadastrados um por mês, então só
// contam no próprio mês em que foram cadastradas.
async function buscarReceitasRecorrentes({ ano, mes, start, end }) {
  const [rows] = await db.query(
    `SELECT ri.ID, ri.RECEITA, ri.VALOR,
       EXISTS (
         SELECT 1 FROM transactions t
         WHERE t.TIPO = 'ENTRADA'
           AND TRIM(UPPER(t.DESCRICAO)) = TRIM(UPPER(ri.RECEITA))
           AND t.DATA BETWEEN ? AND ?
       ) AS pago
     FROM recurring_income ri
     WHERE ri.ATIVO = 1
       AND ri.DATA <= ?
       AND (
         TRIM(UPPER(ri.RECEITA)) = 'SALÁRIO'
         OR (YEAR(ri.DATA) = ? AND MONTH(ri.DATA) = ?)
       )
     ORDER BY pago ASC, ri.RECEITA ASC`,
    [start, end, end, ano, mes]
  );
  return rows;
}

// Devoluções previstas: parcelas de empréstimo (tabela `loan`) com vencimento no
// período. Duas flags, com papéis diferentes e que NÃO devem ser confundidas:
//   - `pago`: existe transação de ENTRADA no período com o mesmo nome do devedor.
//     É o único sinal que tira o valor da previsão, porque só a transação significa
//     que o dinheiro entrou de fato no caixa.
//   - `quitado`: o `status_pago` marcado na página de Empréstimos. Serve de indicador
//     de controle, mas NÃO desconta da previsão — marcar como pago ali não cria
//     transação nenhuma, então esse dinheiro continua sendo esperado no mês.
//   - `atrasada`: a parcela venceu antes do período e continua em aberto.
// `incluirAtrasadas` faz o atraso transbordar para o período: parcela pendente
// que venceu num mês anterior continua sendo dinheiro esperado agora, então
// entra na previsão do mês corrente. Só o mês atual pede isso — repetir no mês
// seguinte contaria o mesmo valor duas vezes. Parcela vencida e já marcada como
// quitada fica de fora: a corrente dela já gerou a parcela deste mês
// (`garantirParcelasDoMes()` em routes/loans.js), e é essa que conta.
async function buscarDevolucoes({ start, end, incluirAtrasadas = false }) {
  const filtroPeriodo = incluirAtrasadas
    ? '(l.data_limite BETWEEN ? AND ? OR (l.status_pago = 0 AND l.data_limite < ?))'
    : 'l.data_limite BETWEEN ? AND ?';
  const paramsPeriodo = incluirAtrasadas ? [start, end, start] : [start, end];

  const [rows] = await db.query(
    `SELECT l.id, l.nome_devedor, l.descricao, l.valor, l.parcela_atual, l.parcelas,
       l.status_pago AS quitado,
       (l.data_limite < ?) AS atrasada,
       EXISTS (
         SELECT 1 FROM transactions t
         WHERE t.TIPO = 'ENTRADA'
           AND TRIM(UPPER(t.DESCRICAO)) = TRIM(UPPER(l.nome_devedor))
           AND t.DATA BETWEEN ? AND ?
       ) AS pago
     FROM loan l
     WHERE ${filtroPeriodo}
     ORDER BY pago ASC, l.data_limite ASC, l.nome_devedor ASC`,
    [start, start, end, ...paramsPeriodo]
  );
  return rows;
}

async function buscarLoans() {
  const [rows] = await db.query(
    `SELECT id, nome_devedor, descricao, valor, parcelas, parcela_atual, data_limite, is_fixo, status_pago
     FROM loan`
  );
  return rows;
}

// Normaliza um DATE do mysql2 (que vem como Date local) para 'YYYY-MM-DD' sem passar
// por UTC — toISOString() deslocaria o dia dependendo do fuso.
const dataISO = (valor) => {
  if (valor instanceof Date) {
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
  }
  return String(valor || '').split('T')[0];
};

// Devoluções que ainda não existem como linha no banco mas vão cair no mês seguinte.
// Trabalha por "corrente" de parcelas (mesmo devedor + mesma descrição) e olha a
// cabeça da corrente — a parcela de maior número:
//   - se a cabeça já está no mês que vem, ela é contada direto (nada a projetar);
//   - se está até o fim do mês atual e ainda gera parcela (fixa ou com parcela
//     restante), projeta uma parcela para o mês seguinte.
// Olhar a cabeça da corrente — em vez de só as parcelas pendentes — é o que faz as
// dívidas fixas e as parceladas já quitadas neste mês aparecerem na previsão do
// próximo mês mesmo quando a parcela seguinte ainda não foi gerada no banco.
function projetarDevolucoesProximoMes(loans, mesAtualRange, mesProxRange) {
  const cabecas = new Map();
  for (const l of loans) {
    const chave = `${normalizarNome(l.nome_devedor)}||${normalizarNome(l.descricao)}`;
    const atual = cabecas.get(chave);
    if (!atual || Number(l.parcela_atual) > Number(atual.parcela_atual)) {
      cabecas.set(chave, l);
    }
  }

  const projetadas = [];
  for (const l of cabecas.values()) {
    const data = dataISO(l.data_limite);
    if (data >= mesProxRange.start && data <= mesProxRange.end) continue; // já lançada
    if (data > mesAtualRange.end) continue; // parcela de um mês mais à frente
    const geraProxima = !!l.is_fixo || Number(l.parcela_atual) < Number(l.parcelas);
    if (!geraProxima) continue;
    projetadas.push({
      ...l,
      parcela_atual: Number(l.parcela_atual) + 1,
      pago: 0,
      quitado: 0,
      projetado: true,
    });
  }
  return projetadas;
}

// ---------- Divisão do custo da casa com a parceira ----------
// O custo da casa (`house_expense`) é rateado meio a meio com a parceira, que já
// existe em `loan` como o devedor DEVEDOR_DIVISAO_CASA. A metade dela NÃO é uma
// linha em `loan`: é derivada de `house_expense` a cada leitura, porque a casa
// muda de valor toda vez que uma compra é lançada ou uma parcela vira o mês —
// manter uma corrente de parcelas espelhada em `loan` significaria sincronizar
// duas tabelas a cada escrita da página Casa.
// Entra na previsão como uma devolução comum e a baixa segue a mesma regra de
// qualquer devolução (ADR-0004): só sai da previsão quando existe transação de
// ENTRADA com o nome do devedor no período.
// Espelhado no frontend por `divisaoCasa` em LoansPage.js e HousePage.js —
// mexer aqui é mexer nos três.
const DEVEDOR_DIVISAO_CASA = 'Amor';
const DESCRICAO_DIVISAO_CASA = 'Div. Casa';
const FRACAO_DIVISAO_CASA = 0.5;

async function buscarGastosCasa() {
  const [rows] = await db.query(
    `SELECT id, descricao, categoria, valor_mensal, parcelas, parcela_atual, data_vencimento, status_pago
     FROM house_expense`
  );
  return rows;
}

// Custo da casa no mês: toda parcela com vencimento no período, paga ou não —
// é o mesmo valor que a página Casa mostra como "Custo Total da Casa · mês atual".
// O rateio é sobre o custo do mês, não sobre o que sobrou a pagar.
function totalCasaDoMes(gastos, range) {
  return gastos
    .filter((g) => {
      const data = dataISO(g.data_vencimento);
      return data >= range.start && data <= range.end;
    })
    .reduce((acc, g) => acc + Number(g.valor_mensal || 0), 0);
}

// Custo da casa no mês seguinte: as parcelas já lançadas para lá mais as que
// ainda vão nascer quando as pendências deste mês forem quitadas. Mesma regra de
// corrente das devoluções (`projetarDevolucoesProximoMes`), agrupando por
// descrição + categoria e partindo da cabeça — a parcela de maior número.
function totalCasaProximoMes(gastos, mesAtualRange, mesProxRange) {
  let total = totalCasaDoMes(gastos, mesProxRange);

  const cabecas = new Map();
  for (const g of gastos) {
    const chave = `${normalizarNome(g.descricao)}||${normalizarNome(g.categoria || 'Outros')}`;
    const atual = cabecas.get(chave);
    if (!atual || Number(g.parcela_atual) > Number(atual.parcela_atual)) {
      cabecas.set(chave, g);
    }
  }

  for (const g of cabecas.values()) {
    const data = dataISO(g.data_vencimento);
    if (data >= mesProxRange.start && data <= mesProxRange.end) continue; // já lançada
    if (data > mesAtualRange.end) continue; // parcela de um mês mais à frente
    if (Number(g.parcela_atual) >= Number(g.parcelas)) continue; // corrente encerrada
    total += Number(g.valor_mensal || 0);
  }

  return total;
}

// Existe transação de ENTRADA com este nome no período? É o sinal de baixa da
// divisão da casa, igual ao de qualquer devolução (ADR-0004).
async function existeEntradaNoPeriodo(nome, { start, end }) {
  const [rows] = await db.query(
    `SELECT EXISTS (
       SELECT 1 FROM transactions t
       WHERE t.TIPO = 'ENTRADA'
         AND TRIM(UPPER(t.DESCRICAO)) = TRIM(UPPER(?))
         AND t.DATA BETWEEN ? AND ?
     ) AS existe`,
    [nome, start, end]
  );
  return !!Number(rows[0].existe);
}

// Devolução sintética com a metade do custo da casa. Array (vazio quando não há
// custo) para poder ser espalhada na lista de devoluções do mês.
function montarDivisaoCasa(totalCasa, pago) {
  const valor = Number(totalCasa || 0) * FRACAO_DIVISAO_CASA;
  if (!(valor > 0)) return [];
  return [{
    id: null,
    origem: 'casa',
    nome_devedor: DEVEDOR_DIVISAO_CASA,
    descricao: DESCRICAO_DIVISAO_CASA,
    valor,
    parcela_atual: null,
    parcelas: null,
    quitado: 0,
    atrasada: 0,
    pago: pago ? 1 : 0,
  }];
}

// Descrições (normalizadas) de transações de SAIDA lançadas no período. Serve para
// dar baixa na fatura de um cartão quando existe uma transação com o mesmo nome do
// cartão — mesma convenção já usada pelas despesas fixas.
async function buscarDescricoesSaidas({ start, end }) {
  const [rows] = await db.query(
    `SELECT DISTINCT TRIM(UPPER(DESCRICAO)) AS descricao
     FROM transactions
     WHERE TIPO = 'SAIDA'
       AND DATA BETWEEN ? AND ?
       AND DESCRICAO IS NOT NULL`,
    [start, end]
  );
  return new Set(rows.map((r) => r.descricao));
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

  const porCartaoLista = [];

  for (const [nome, c] of Object.entries(porCartao)) {
    const valorProximo = c.temLancamentoProximo ? c.proximoLancado : c.proximoProjetado;
    porCartaoLista.push({ cartao: nome, atual: c.atual, proximo: valorProximo });
  }

  return { porCartao: porCartaoLista };
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
    despesasFixasAtual,
    despesasFixasProx,
    receitasAtual,
    receitasProx,
    devolucoesAtual,
    devolucoesProxLancadas,
    loansTodos,
    gastosCasa,
    totaisAtual,
    totaisProx,
    faturaCartoes,
    saidasDescricoesAtual,
    saidasDescricoesProx,
    investimentosTotal,
    entradaDivisaoCasaAtual,
    entradaDivisaoCasaProx,
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
    buscarDespesasFixas(mesAtualRange),
    buscarDespesasFixas(mesProxRange),
    buscarReceitasRecorrentes(mesAtualRange),
    buscarReceitasRecorrentes(mesProxRange),
    buscarDevolucoes({ ...mesAtualRange, incluirAtrasadas: true }),
    buscarDevolucoes(mesProxRange),
    buscarLoans(),
    buscarGastosCasa(),
    buscarTotaisTransacoes(mesAtualRange),
    buscarTotaisTransacoes(mesProxRange),
    buscarFaturaCartoes(mesAtualRange, mesProxRange),
    buscarDescricoesSaidas(mesAtualRange),
    buscarDescricoesSaidas(mesProxRange),
    buscarInvestimentosTotal(),
    existeEntradaNoPeriodo(DEVEDOR_DIVISAO_CASA, mesAtualRange),
    existeEntradaNoPeriodo(DEVEDOR_DIVISAO_CASA, mesProxRange),
  ]);

  // Desconta o total aplicado em investimentos, já que essa saída de caixa nunca
  // é registrada como transação de SAÍDA (confirmado com o usuário)
  const saldoAnterior = Number(saldoAnteriorRows[0][0].saldo) - investimentosTotal;

  // Faturas por cartão de cada mês, já com a baixa aplicada quando existe uma
  // transação de SAIDA com o mesmo nome do cartão dentro do período.
  const montarFaturas = (chaveValor, descricoesSaidas) => faturaCartoes.porCartao
    .map((c) => ({
      nome: c.cartao,
      valor: Number(c[chaveValor] || 0),
      pago: descricoesSaidas.has(normalizarNome(c.cartao)),
    }))
    .filter((f) => f.valor > 0);

  const faturasAtual = montarFaturas('atual', saidasDescricoesAtual);
  const faturasProx = montarFaturas('proximo', saidasDescricoesProx);

  const devolucoesProxProjetadas = projetarDevolucoesProximoMes(loansTodos, mesAtualRange, mesProxRange);

  // Metade do custo da casa, cobrada da parceira nos dois meses. No próximo mês o
  // rateio considera também as parcelas da casa que ainda não existem como linha.
  const divisaoCasaAtual = montarDivisaoCasa(
    totalCasaDoMes(gastosCasa, mesAtualRange),
    entradaDivisaoCasaAtual
  );
  const divisaoCasaProx = montarDivisaoCasa(
    totalCasaProximoMes(gastosCasa, mesAtualRange, mesProxRange),
    entradaDivisaoCasaProx
  );

  // Só o que ainda está pendente entra no cálculo; o que já foi pago/recebido
  // continua na lista de detalhes (riscado no dashboard) mas fora das previsões,
  // porque já está refletido nos totais de transações do mês.
  const somarPendentes = (itens, campoValor) => itens
    .filter((i) => !i.pago)
    .reduce((acc, i) => acc + Number(i[campoValor] || 0), 0);

  const montarMes = ({ range, despesasFixas, receitas, devolucoes, faturas, totaisTransacoes, saldoInicial }) => {
    const totalDespesasFixas = somarPendentes(despesasFixas, 'VALOR');
    const totalReceitas = somarPendentes(receitas, 'VALOR');
    const totalDevolucoes = somarPendentes(devolucoes, 'valor');
    const totalFaturas = somarPendentes(faturas, 'valor');

    const entradasPrevistas = totalReceitas + totalDevolucoes + totaisTransacoes.entradas;
    const saidasPrevistas = totalDespesasFixas + totalFaturas + totaisTransacoes.saidas;
    const saldoFinal = saldoInicial + entradasPrevistas - saidasPrevistas;

    return {
      ano: range.ano,
      mes: range.mes,
      saldoInicial,
      entradasPrevistas,
      saidasPrevistas,
      saldoFinal,
      detalhes: {
        despesasFixas: despesasFixas.map(d => ({
          id: d.ID,
          nome: d.DESPESA,
          valor: Number(d.VALOR),
          pago: !!d.pago,
        })),
        receitasRecorrentes: receitas.map(r => ({
          id: r.ID,
          nome: r.RECEITA,
          valor: Number(r.VALOR),
          pago: !!r.pago,
        })),
        devolucoes: devolucoes.map(d => ({
          id: d.id,
          nome: d.nome_devedor,
          descricao: d.descricao,
          valor: Number(d.valor),
          parcelaAtual: d.parcela_atual,
          parcelas: d.parcelas,
          pago: !!d.pago,
          quitado: !!d.quitado,
          atrasada: !!d.atrasada,
          projetado: !!d.projetado,
          origem: d.origem || null,
        })),
        faturasCartao: faturas,
        transacoesEntradas: totaisTransacoes.entradas,
        transacoesSaidas: totaisTransacoes.saidas,
        faturaCartoes: totalFaturas,
        devolucoesPrevistas: totalDevolucoes,
      },
    };
  };

  const mesAtualResultado = montarMes({
    range: mesAtualRange,
    despesasFixas: despesasFixasAtual,
    receitas: receitasAtual,
    devolucoes: [...devolucoesAtual, ...divisaoCasaAtual],
    faturas: faturasAtual,
    totaisTransacoes: totaisAtual,
    saldoInicial: saldoAnterior,
  });

  const proximoMesResultado = montarMes({
    range: mesProxRange,
    despesasFixas: despesasFixasProx,
    receitas: receitasProx,
    // Parcelas já lançadas para o mês que vem + as que serão geradas ao quitar as pendências deste mês
    devolucoes: [...devolucoesProxLancadas, ...devolucoesProxProjetadas, ...divisaoCasaProx],
    faturas: faturasProx,
    totaisTransacoes: totaisProx,
    saldoInicial: mesAtualResultado.saldoFinal,
  });

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

      // 8. Resumo dos Cartões (limite vs fatura mais recente). `fatura_paga` sinaliza
      //    que existe uma transação de SAIDA com o mesmo nome do cartão no mês atual —
      //    mesma convenção de baixa por nome usada pelas despesas fixas.
      db.query(`
        SELECT cd.id, cd.nome, cd.limite_total, cd.vencimento_dia,
          COALESCE(cr.fatura_atual, 0) as fatura_atual,
          EXISTS (
            SELECT 1 FROM transactions t
            WHERE t.TIPO = 'SAIDA'
              AND TRIM(UPPER(t.DESCRICAO)) = TRIM(UPPER(cd.nome))
              AND YEAR(t.DATA) = YEAR(CURDATE())
              AND MONTH(t.DATA) = MONTH(CURDATE())
          ) as fatura_paga
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
        faturaPaga: !!r.fatura_paga,
      })),
      previsaoSaldo,
    });
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do dashboard' });
  }
});

module.exports = router;
