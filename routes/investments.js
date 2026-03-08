const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM investment ORDER BY DATA DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar investimentos' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { DATA, CATEGORIA, VALOR, RENDIMENTO } = req.body;
    const [result] = await db.query(
      'INSERT INTO investment (DATA, CATEGORIA, VALOR, RENDIMENTO) VALUES (?, ?, ?, ?)',
      [DATA, CATEGORIA, VALOR, RENDIMENTO]
    );
    res.status(201).json({ id: result.insertId, message: 'Investimento criado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar investimento' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { DATA, CATEGORIA, VALOR, RENDIMENTO } = req.body;
    await db.query(
      'UPDATE investment SET DATA = ?, CATEGORIA = ?, VALOR = ?, RENDIMENTO = ? WHERE ID = ?',
      [DATA, CATEGORIA, VALOR, RENDIMENTO, id]
    );
    res.json({ message: 'Investimento atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar investimento' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM investment WHERE ID = ?', [id]);
    res.json({ message: 'Investimento excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir investimento' });
  }
});

module.exports = router;