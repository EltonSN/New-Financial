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

// GET - Listar todos os empréstimos
router.get('/', async (req, res) => {
  try {
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

// PUT - Atualizar dados de um empréstimo
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome_devedor, descricao, valor, parcelas, parcela_atual, data_limite, is_fixo } = req.body;
    await db.query(
      `UPDATE loan
       SET nome_devedor = ?, descricao = ?, valor = ?, parcelas = ?, parcela_atual = ?, data_limite = ?, is_fixo = ?
       WHERE id = ?`,
      [nome_devedor, descricao || null, valor, parcelas || 1, parcela_atual || 1, data_limite, is_fixo ? 1 : 0, id]
    );
    res.json({ message: 'Empréstimo atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar empréstimo:', error);
    res.status(500).json({ error: 'Erro ao atualizar empréstimo' });
  }
});

// POST - Marcar empréstimo como pago. Quando is_fixo = 1, mantém este registro
// quitado no mês atual e projeta automaticamente a cobrança para o mês seguinte.
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
    if (loan.is_fixo) {
      const [result] = await db.query(
        `INSERT INTO loan (nome_devedor, descricao, valor, parcelas, parcela_atual, data_limite, is_fixo, status_pago)
         VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
        [
          loan.nome_devedor,
          loan.descricao,
          loan.valor,
          loan.parcelas,
          loan.parcela_atual + 1,
          proximaDataLimite(loan.data_limite),
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

// DELETE - Excluir empréstimo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM loan WHERE id = ?', [id]);
    res.json({ message: 'Empréstimo excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir empréstimo:', error);
    res.status(500).json({ error: 'Erro ao excluir empréstimo' });
  }
});

module.exports = router;
