const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM fixed_expense ORDER BY DATA DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar despesas fixas' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { DATA, DESPESA, VALOR } = req.body;
    const [result] = await db.query(
      'INSERT INTO fixed_expense (DATA, DESPESA, VALOR) VALUES (?, ?, ?)',
      [DATA, DESPESA, VALOR]
    );
    res.status(201).json({ id: result.insertId, message: 'Despesa criada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar despesa' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { DATA, DESPESA, VALOR } = req.body;
    await db.query(
      'UPDATE fixed_expense SET DATA = ?, DESPESA = ?, VALOR = ? WHERE ID = ?',
      [DATA, DESPESA, VALOR, id]
    );
    res.json({ message: 'Despesa atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar despesa' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM fixed_expense WHERE ID = ?', [id]);
    res.json({ message: 'Despesa excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir despesa' });
  }
});

module.exports = router;