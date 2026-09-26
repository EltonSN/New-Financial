const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Avança data_limite em um mês, ajustando para o último dia do mês seguinte
// quando o dia original não existir nele (ex.: 31/01 -> 28 ou 29/02)
function proximaDataLimite(dataLimite) {
  const data = dataLimite instanceof Date
    ? new Date(dataLimite.getFullYear(), dataLimite.getMonth(), dataLimite.getDate())
    : new Date(`${String(dataLimite).split('T')[0]}T00:00:00`);
  const dia = data.getDate();
  const proximoMes = new Date(data.getFullYear(), data.getMonth() + 1, 1);
  const ultimoDiaProximoMes = new Date(proximoMes.getFullYear(), proximoMes.getMonth() + 1, 0).getDate();
  proximoMes.setDate(Math.min(dia, ultimoDiaProximoMes));
  return proximoMes.toISOString().split('T')[0];
}

// Normaliza um DATE do mysql2 (que vem como Date local) para 'YYYY-MM-DD' sem
// passar por UTC — toISOString() deslocaria o dia dependendo do fuso.
function dataISO(valor) {
  if (valor instanceof Date) {
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
  }
  return String(valor || '').split('T')[0];
}

// Uma corrente só gera a parcela seguinte se for fixa (dívida perpétua) ou se
// ainda houver parcela a vencer.
const geraProximaParcela = (loan) => !!loan.is_fixo || Number(loan.parcela_atual) < Number(loan.parcelas);

const chaveCorrente = (loan) =>
  `${String(loan.nome_devedor || '').trim().toUpperCase()}||${String(loan.descricao || '').trim().toUpperCase()}`;

// Pagamento parcial. O parcial NÃO é uma coluna de `loan`: é a própria transação
// de ENTRADA que o registra, ligada à parcela por `transactions.emprestimo_id`.
// Assim o dinheiro recebido existe num lugar só — editar ou excluir a transação
// na página Transações muda o histórico da dívida junto, sem sincronização. A
// Previsão de Saldo desconta o parcial da parcela e ignora essas transações na
// baixa por nome (routes/dashboard.js), senão um parcial do Fulano daria baixa
// em todas as devoluções dele.
const CATEGORIA_DEVOLUCAO = 'DEVOLUCAO';

// Comparação de dinheiro em centavos inteiros — somar DECIMAL como float faz
// 33.33 + 33.33 + 33.34 não fechar 100.00.
const centavos = (valor) => Math.round(Number(valor || 0) * 100);

async function totalRecebido(conn, loanId) {
  const [rows] = await conn.query(
    'SELECT COALESCE(SUM(VALOR), 0) AS recebido FROM transactions WHERE emprestimo_id = ?',
    [loanId]
  );
  return Number(rows[0].recebido);
}

// Quita a parcela e cria a seguinte quando a corrente continua viva. Compartilhada
// entre o ✓ (`/pagar`) e o parcial que completa o valor da parcela. `conn` é o
// pool ou uma conexão com transação aberta.
async function quitarParcela(conn, loan) {
  await conn.query('UPDATE loan SET status_pago = 1 WHERE id = ?', [loan.id]);

  if (!geraProximaParcela(loan)) return null;

  const [result] = await conn.query(
    `INSERT INTO loan (nome_devedor, descricao, valor, parcelas, parcela_atual, data_limite, is_fixo, status_pago)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      loan.nome_devedor,
      loan.descricao,
      loan.valor,
      loan.parcelas,
      loan.parcela_atual + 1,
      proximaDataLimite(loan.data_limite),
      loan.is_fixo ? 1 : 0,
    ]
  );
  return result.insertId;
}

// Virada de mês. Cada parcela é uma linha própria e a linha seguinte só nasce
// quando a atual é quitada pelo endpoint /pagar — se o mês virar sem que isso
// tenha acontecido (baixa feita direto no banco, dívida quitada antes de este
// comportamento existir), a corrente fica parada no mês passado e a dívida
// simplesmente some da tela em vez de virar a pendência do mês atual.
//
// Aqui, para cada corrente (mesmo devedor + mesma descrição), olhamos a cabeça
// — a parcela de maior número — e criamos a parcela seguinte como pendente
// quando ela está quitada, num mês anterior ao atual e ainda gera parcela.
// Cabeça pendente não gera nada: parcela atrasada continua sendo a pendência
// em aberto, não vira duas. Por isso a rotina avança no máximo um mês por
// corrente e é idempotente — rodar de novo logo em seguida não faz nada.
async function garantirParcelasDoMes() {
  const [loans] = await db.query('SELECT * FROM loan');

  const hoje = new Date();
  const inicioMesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;

  const cabecas = new Map();
  for (const loan of loans) {
    const chave = chaveCorrente(loan);
    const atual = cabecas.get(chave);
    if (!atual || Number(loan.parcela_atual) > Number(atual.parcela_atual)) {
      cabecas.set(chave, loan);
    }
  }

  for (const cabeca of cabecas.values()) {
    if (!cabeca.status_pago) continue;
    if (dataISO(cabeca.data_limite) >= inicioMesAtual) continue;
    if (!geraProximaParcela(cabeca)) continue;

    // O NOT EXISTS deixa a inserção segura contra duas chamadas simultâneas
    // (StrictMode em dev dispara o load duas vezes) criando a mesma parcela.
    await db.query(
      `INSERT INTO loan (nome_devedor, descricao, valor, parcelas, parcela_atual, data_limite, is_fixo, status_pago)
       SELECT ?, ?, ?, ?, ?, ?, ?, 0 FROM DUAL
       WHERE NOT EXISTS (
         SELECT 1 FROM (SELECT nome_devedor, descricao, parcela_atual FROM loan) existente
         WHERE TRIM(UPPER(existente.nome_devedor)) = TRIM(UPPER(?))
           AND TRIM(UPPER(COALESCE(existente.descricao, ''))) = TRIM(UPPER(COALESCE(?, '')))
           AND existente.parcela_atual >= ?
       )`,
      [
        cabeca.nome_devedor,
        cabeca.descricao,
        cabeca.valor,
        cabeca.parcelas,
        Number(cabeca.parcela_atual) + 1,
        proximaDataLimite(cabeca.data_limite),
        cabeca.is_fixo ? 1 : 0,
        cabeca.nome_devedor,
        cabeca.descricao,
        Number(cabeca.parcela_atual) + 1,
      ]
    );
  }
}

// GET - Listar todos os empréstimos, já com a virada de mês aplicada
router.get('/', async (req, res) => {
  try {
    await garantirParcelasDoMes();
    const [[rows], [pagamentos]] = await Promise.all([
      db.query('SELECT * FROM loan ORDER BY status_pago ASC, data_limite ASC'),
      db.query(
        `SELECT ID, emprestimo_id, DATA, VALOR FROM transactions
         WHERE emprestimo_id IS NOT NULL
         ORDER BY DATA ASC, ID ASC`
      ),
    ]);

    // Cada parcela leva o histórico dos seus parciais e o total já recebido.
    const porParcela = new Map();
    for (const p of pagamentos) {
      if (!porParcela.has(p.emprestimo_id)) porParcela.set(p.emprestimo_id, []);
      porParcela.get(p.emprestimo_id).push({ id: p.ID, data: dataISO(p.DATA), valor: Number(p.VALOR) });
    }

    res.json(rows.map((loan) => {
      const doLoan = porParcela.get(loan.id) || [];
      const recebido = doLoan.reduce((acc, p) => acc + centavos(p.valor), 0) / 100;
      return { ...loan, pagamentos: doLoan, valor_recebido: recebido };
    }));
  } catch (error) {
    console.error('Erro ao buscar empréstimos:', error);
    res.status(500).json({ error: 'Erro ao buscar empréstimos' });
  }
});

// GET - Existe transação de ENTRADA com este nome no mês atual? É a baixa por
// nome (ADR-0004) que `routes/dashboard.js` aplica na previsão, exposta para a
// página Empréstimos saber se a divisão da casa — que não tem linha em `loan` —
// já foi recebida. Parciais (`emprestimo_id` preenchido) pagam a própria parcela
// e não contam, mesma regra de `existeEntradaNoPeriodo()` no dashboard.
router.get('/baixa', async (req, res) => {
  try {
    const nome = String(req.query.nome || '').trim();
    if (!nome) {
      return res.status(400).json({ error: 'Informe o nome' });
    }

    const hoje = new Date();
    const inicio = dataISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
    const fim = dataISO(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0));

    const [rows] = await db.query(
      `SELECT EXISTS (
         SELECT 1 FROM transactions t
         WHERE t.TIPO = 'ENTRADA'
           AND t.emprestimo_id IS NULL
           AND TRIM(UPPER(t.DESCRICAO)) = TRIM(UPPER(?))
           AND t.DATA BETWEEN ? AND ?
       ) AS existe`,
      [nome, inicio, fim]
    );

    res.json({ nome, mesAtual: !!Number(rows[0].existe) });
  } catch (error) {
    console.error('Erro ao verificar baixa por nome:', error);
    res.status(500).json({ error: 'Erro ao verificar baixa por nome' });
  }
});

// POST - Criar novo empréstimo. parcela_atual permite registrar dívidas antigas
// que já tiveram parcelas pagas anteriormente (ex.: parcela_atual = 4 para uma
// dívida de 10x em que as 3 primeiras já foram pagas fora do sistema).
router.post('/', async (req, res) => {
  try {
    const { nome_devedor, descricao, valor, parcelas, parcela_atual, data_limite, is_fixo } = req.body;
    const [result] = await db.query(
      `INSERT INTO loan (nome_devedor, descricao, valor, parcelas, parcela_atual, data_limite, is_fixo, status_pago)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [nome_devedor, descricao || null, valor, parcelas || 1, parcela_atual || 1, data_limite, is_fixo ? 1 : 0]
    );
    res.status(201).json({ id: result.insertId, message: 'Empréstimo criado com sucesso' });
  } catch (error) {
    console.error('Erro ao criar empréstimo:', error);
    res.status(500).json({ error: 'Erro ao criar empréstimo' });
  }
});

// PUT - Atualizar dados de um empréstimo.
//
// Uma dívida é uma CORRENTE de linhas identificada por `nome_devedor +
// descricao`, e a tela só mostra uma linha dela. Editar só a linha clicada
// **parte a corrente em duas**: as parcelas antigas continuam com o nome velho,
// perdem a sucessora, voltam a aparecer na lista — e a dívida aparece duplicada,
// uma com cada nome. Numa dívida fixa a cabeça velha ainda gera parcela nova em
// `garantirParcelasDoMes()`, então a duplicata se reproduz sozinha.
//
// Por isso os campos se dividem em dois grupos:
//   - identidade da corrente (`nome_devedor`, `descricao`, `parcelas`, `is_fixo`)
//     → aplicados em TODAS as linhas da corrente, para ela continuar inteira;
//   - dados da parcela (`valor`, `parcela_atual`, `data_limite`) → só na linha
//     editada. `valor` não reescreve o histórico: as parcelas futuras nascem da
//     cabeça da corrente, então o valor novo já vale para os meses seguintes.
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome_devedor, descricao, valor, parcelas, parcela_atual, data_limite, is_fixo } = req.body;

    const [rows] = await db.query('SELECT nome_devedor, descricao FROM loan WHERE id = ?', [id]);
    const atual = rows[0];

    if (!atual) {
      return res.status(404).json({ error: 'Empréstimo não encontrado' });
    }

    const [resultCorrente] = await db.query(
      `UPDATE loan
       SET nome_devedor = ?, descricao = ?, parcelas = ?, is_fixo = ?
       WHERE TRIM(UPPER(nome_devedor)) = TRIM(UPPER(?))
         AND TRIM(UPPER(COALESCE(descricao, ''))) = TRIM(UPPER(COALESCE(?, '')))`,
      [nome_devedor, descricao || null, parcelas || 1, is_fixo ? 1 : 0, atual.nome_devedor, atual.descricao]
    );

    await db.query(
      'UPDATE loan SET valor = ?, parcela_atual = ?, data_limite = ? WHERE id = ?',
      [valor, parcela_atual || 1, data_limite, id]
    );

    res.json({
      message: 'Empréstimo atualizado com sucesso',
      parcelasAtualizadas: resultCorrente.affectedRows,
    });
  } catch (error) {
    console.error('Erro ao atualizar empréstimo:', error);
    res.status(500).json({ error: 'Erro ao atualizar empréstimo' });
  }
});

// POST - Marcar empréstimo como pago. Mantém este registro quitado no mês atual
// e projeta a parcela seguinte sempre que a corrente continua viva — dívida fixa
// (perpétua) ou parcelamento com parcela restante, o mesmo critério de
// house_expense.
router.post('/:id/pagar', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM loan WHERE id = ?', [id]);
    const loan = rows[0];

    if (!loan) {
      return res.status(404).json({ error: 'Empréstimo não encontrado' });
    }

    if (loan.status_pago) {
      return res.json({ message: 'Empréstimo já estava quitado' });
    }

    const proximoId = await quitarParcela(db, loan);

    res.json({ message: 'Empréstimo marcado como pago', proximoId });
  } catch (error) {
    console.error('Erro ao marcar empréstimo como pago:', error);
    res.status(500).json({ error: 'Erro ao marcar empréstimo como pago' });
  }
});

// POST - Registrar um pagamento parcial da parcela. Grava a transação de ENTRADA
// (descrição = devedor, categoria DEVOLUCAO) ligada à parcela e, quando os
// parciais somados fecham o valor dela, quita a parcela como o ✓ faria — o que
// cria a parcela seguinte da corrente. Tudo numa transação do MySQL: não pode
// sobrar entrada sem quitação, nem quitação sem entrada.
router.post('/:id/pagamentos', async (req, res) => {
  const { id } = req.params;
  const { valor, data } = req.body;
  const valorCentavos = centavos(valor);

  if (!(valorCentavos > 0)) {
    return res.status(400).json({ error: 'Informe um valor maior que zero' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data || ''))) {
    return res.status(400).json({ error: 'Informe a data do pagamento' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM loan WHERE id = ? FOR UPDATE', [id]);
    const loan = rows[0];
    if (!loan) {
      await conn.rollback();
      return res.status(404).json({ error: 'Empréstimo não encontrado' });
    }
    if (loan.status_pago) {
      await conn.rollback();
      return res.status(400).json({ error: 'Esta parcela já está paga' });
    }

    const faltaCentavos = centavos(loan.valor) - centavos(await totalRecebido(conn, id));
    if (valorCentavos > faltaCentavos) {
      await conn.rollback();
      return res.status(400).json({
        error: `O valor passa do que falta desta parcela (R$ ${(faltaCentavos / 100).toFixed(2).replace('.', ',')})`,
      });
    }

    // Sem a categoria cadastrada o parcial é gravado mesmo assim, sem categoria —
    // perder o registro do dinheiro recebido seria pior.
    const [categorias] = await conn.query(
      'SELECT id FROM categories WHERE TRIM(UPPER(nome)) = ? LIMIT 1',
      [CATEGORIA_DEVOLUCAO]
    );

    const [result] = await conn.query(
      `INSERT INTO transactions (DATA, TIPO, categoria_id, DESCRICAO, VALOR, emprestimo_id)
       VALUES (?, 'ENTRADA', ?, ?, ?, ?)`,
      [data, categorias[0] ? categorias[0].id : null, loan.nome_devedor, valorCentavos / 100, id]
    );

    const quitada = valorCentavos === faltaCentavos;
    const proximoId = quitada ? await quitarParcela(conn, loan) : null;

    await conn.commit();
    res.status(201).json({
      id: result.insertId,
      quitada,
      proximoId,
      message: quitada ? 'Pagamento registrado e parcela quitada' : 'Pagamento parcial registrado',
    });
  } catch (error) {
    await conn.rollback().catch(() => {});
    console.error('Erro ao registrar pagamento parcial:', error);
    res.status(500).json({ error: 'Erro ao registrar pagamento parcial' });
  } finally {
    conn.release();
  }
});

// DELETE - Excluir um pagamento parcial, ou seja, a transação de ENTRADA dele.
//
// Se foram os parciais que quitaram a parcela, tirar um deles a reabre — e a
// parcela seguinte, criada na quitação, precisa sumir junto, senão a corrente
// fica com duas pendentes. Só dá para desfazer isso enquanto a seguinte ainda
// está intacta (pendente e sem parciais próprios); fora disso a exclusão é
// recusada com 409 em vez de reescrever uma corrente que já andou.
// Parcela quitada pelo ✓ (com parciais que não fechavam o valor) continua paga:
// o ✓ é controle manual e não depende dos parciais.
router.delete('/:id/pagamentos/:transacaoId', async (req, res) => {
  const { id, transacaoId } = req.params;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM loan WHERE id = ? FOR UPDATE', [id]);
    const loan = rows[0];
    const [transacoes] = await conn.query(
      'SELECT ID FROM transactions WHERE ID = ? AND emprestimo_id = ?',
      [transacaoId, id]
    );
    if (!loan || transacoes.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    let reaberta = false;
    const quitadaPelosParciais = loan.status_pago
      && centavos(await totalRecebido(conn, id)) >= centavos(loan.valor);

    if (quitadaPelosParciais) {
      const [seguintes] = await conn.query(
        `SELECT l.id, l.status_pago,
           (SELECT COUNT(*) FROM transactions t WHERE t.emprestimo_id = l.id) AS parciais
         FROM loan l
         WHERE TRIM(UPPER(l.nome_devedor)) = TRIM(UPPER(?))
           AND TRIM(UPPER(COALESCE(l.descricao, ''))) = TRIM(UPPER(COALESCE(?, '')))
           AND l.parcela_atual > ?`,
        [loan.nome_devedor, loan.descricao, loan.parcela_atual]
      );

      const intacta = seguintes.length === 0
        || (seguintes.length === 1 && !seguintes[0].status_pago && Number(seguintes[0].parciais) === 0);
      if (!intacta) {
        await conn.rollback();
        return res.status(409).json({
          error: 'A parcela seguinte desta dívida já recebeu pagamento. Desfaça os pagamentos dela antes de excluir este.',
        });
      }

      if (seguintes.length === 1) {
        await conn.query('DELETE FROM loan WHERE id = ?', [seguintes[0].id]);
      }
      await conn.query('UPDATE loan SET status_pago = 0 WHERE id = ?', [id]);
      reaberta = true;
    }

    await conn.query('DELETE FROM transactions WHERE ID = ?', [transacaoId]);

    await conn.commit();
    res.json({
      reaberta,
      message: reaberta ? 'Pagamento excluído e parcela reaberta' : 'Pagamento excluído',
    });
  } catch (error) {
    await conn.rollback().catch(() => {});
    console.error('Erro ao excluir pagamento parcial:', error);
    res.status(500).json({ error: 'Erro ao excluir pagamento parcial' });
  } finally {
    conn.release();
  }
});

// DELETE - Excluir a dívida inteira, ou seja, a CORRENTE toda (`nome_devedor +
// descricao`), não só a linha clicada.
//
// Apagar uma linha só não resolve: a parcela anterior volta a ser a cabeça da
// corrente e reaparece na lista. Pior numa dívida fixa — a cabeça fica quitada e
// datada num mês anterior, que é exatamente a condição de
// `garantirParcelasDoMes()` para criar a parcela seguinte, então a linha excluída
// **renasce** no próximo GET e a exclusão parece não ter acontecido.
//
// Não existe flag de "corrente encerrada" no modelo, então remover as linhas é a
// única forma de parar uma dívida fixa. O histórico das parcelas pagas vai com
// ela; a UI avisa quantas serão removidas antes de confirmar.
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT nome_devedor, descricao FROM loan WHERE id = ?', [id]);
    const loan = rows[0];

    if (!loan) {
      return res.status(404).json({ error: 'Empréstimo não encontrado' });
    }

    const [result] = await db.query(
      `DELETE FROM loan
       WHERE TRIM(UPPER(nome_devedor)) = TRIM(UPPER(?))
         AND TRIM(UPPER(COALESCE(descricao, ''))) = TRIM(UPPER(COALESCE(?, '')))`,
      [loan.nome_devedor, loan.descricao]
    );

    res.json({ message: 'Empréstimo excluído com sucesso', removidos: result.affectedRows });
  } catch (error) {
    console.error('Erro ao excluir empréstimo:', error);
    res.status(500).json({ error: 'Erro ao excluir empréstimo' });
  }
});

module.exports = router;
