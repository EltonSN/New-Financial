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
    const [rows] = await db.query('SELECT * FROM loan ORDER BY status_pago ASC, data_limite ASC');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar empréstimos:', error);
    res.status(500).json({ error: 'Erro ao buscar empréstimos' });
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

    await db.query('UPDATE loan SET status_pago = 1 WHERE id = ?', [id]);

    let proximoId = null;
    if (geraProximaParcela(loan)) {
      const [result] = await db.query(
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
      proximoId = result.insertId;
    }

    res.json({ message: 'Empréstimo marcado como pago', proximoId });
  } catch (error) {
    console.error('Erro ao marcar empréstimo como pago:', error);
    res.status(500).json({ error: 'Erro ao marcar empréstimo como pago' });
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
