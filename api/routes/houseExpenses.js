const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Avança data_vencimento em um mês, ajustando para o último dia do mês seguinte
// quando o dia original não existir nele (ex.: 31/01 -> 28 ou 29/02)
function proximoVencimento(dataVencimento) {
  const data = dataVencimento instanceof Date
    ? new Date(dataVencimento.getFullYear(), dataVencimento.getMonth(), dataVencimento.getDate())
    : new Date(`${String(dataVencimento).split('T')[0]}T00:00:00`);
  const dia = data.getDate();
  const proximoMes = new Date(data.getFullYear(), data.getMonth() + 1, 1);
  const ultimoDiaProximoMes = new Date(proximoMes.getFullYear(), proximoMes.getMonth() + 1, 0).getDate();
  proximoMes.setDate(Math.min(dia, ultimoDiaProximoMes));
  return proximoMes.toISOString().split('T')[0];
}

// GET - Listar todos os gastos da casa
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM house_expense ORDER BY status_pago ASC, data_vencimento ASC, categoria ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar gastos da casa:', error);
    res.status(500).json({ error: 'Erro ao buscar gastos da casa' });
  }
});

// POST - Criar novo gasto da casa. parcela_atual permite registrar compras antigas
// que já tiveram parcelas pagas fora do sistema (ex.: parcela_atual = 4 numa
// compra de 10x em que as 3 primeiras já foram quitadas).
router.post('/', async (req, res) => {
  try {
    const { descricao, categoria, valor_mensal, parcelas, parcela_atual, data_vencimento } = req.body;
    const [result] = await db.query(
      `INSERT INTO house_expense (descricao, categoria, valor_mensal, parcelas, parcela_atual, data_vencimento, status_pago)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [descricao, categoria || 'Outros', valor_mensal, parcelas || 1, parcela_atual || 1, data_vencimento]
    );
    res.status(201).json({ id: result.insertId, message: 'Gasto da casa criado com sucesso' });
  } catch (error) {
    console.error('Erro ao criar gasto da casa:', error);
    res.status(500).json({ error: 'Erro ao criar gasto da casa' });
  }
});

// PUT - Atualizar dados de um gasto da casa
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { descricao, categoria, valor_mensal, parcelas, parcela_atual, data_vencimento, status_pago } = req.body;
    await db.query(
      `UPDATE house_expense
       SET descricao = ?, categoria = ?, valor_mensal = ?, parcelas = ?, parcela_atual = ?, data_vencimento = ?, status_pago = ?
       WHERE id = ?`,
      [
        descricao,
        categoria || 'Outros',
        valor_mensal,
        parcelas || 1,
        parcela_atual || 1,
        data_vencimento,
        status_pago ? 1 : 0,
        id,
      ]
    );
    res.json({ message: 'Gasto da casa atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar gasto da casa:', error);
    res.status(500).json({ error: 'Erro ao atualizar gasto da casa' });
  }
});

// POST - Marcar a parcela do mês como paga. Se ainda houver parcelas restantes,
// projeta automaticamente a próxima parcela para o mês seguinte.
router.post('/:id/pagar', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM house_expense WHERE id = ?', [id]);
    const gasto = rows[0];

    if (!gasto) {
      return res.status(404).json({ error: 'Gasto da casa não encontrado' });
    }

    if (gasto.status_pago) {
      return res.json({ message: 'Parcela já estava quitada' });
    }

    await db.query('UPDATE house_expense SET status_pago = 1 WHERE id = ?', [id]);

    let proximoId = null;
    if (gasto.parcela_atual < gasto.parcelas) {
      const [result] = await db.query(
        `INSERT INTO house_expense (descricao, categoria, valor_mensal, parcelas, parcela_atual, data_vencimento, status_pago)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [
          gasto.descricao,
          gasto.categoria,
          gasto.valor_mensal,
          gasto.parcelas,
          gasto.parcela_atual + 1,
          proximoVencimento(gasto.data_vencimento),
        ]
      );
      proximoId = result.insertId;
    }

    res.json({ message: 'Parcela marcada como paga', proximoId });
  } catch (error) {
    console.error('Erro ao marcar gasto da casa como pago:', error);
    res.status(500).json({ error: 'Erro ao marcar gasto da casa como pago' });
  }
});

// POST - Desfazer o pagamento da parcela (reabre o registro como pendente)
router.post('/:id/reabrir', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('UPDATE house_expense SET status_pago = 0 WHERE id = ?', [id]);
    res.json({ message: 'Parcela reaberta como pendente' });
  } catch (error) {
    console.error('Erro ao reabrir gasto da casa:', error);
    res.status(500).json({ error: 'Erro ao reabrir gasto da casa' });
  }
});

// DELETE - Excluir gasto da casa
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM house_expense WHERE id = ?', [id]);
    res.json({ message: 'Gasto da casa excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir gasto da casa:', error);
    res.status(500).json({ error: 'Erro ao excluir gasto da casa' });
  }
});

module.exports = router;
