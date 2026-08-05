const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET - Listar todas as receitas recorrentes
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM recurring_income ORDER BY DATA DESC');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar receitas recorrentes:', error);
    res.status(500).json({ error: 'Erro ao buscar receitas recorrentes' });
  }
});

// POST - Criar nova receita recorrente
router.post('/', async (req, res) => {
  try {
    const { DATA, RECEITA, VALOR, ATIVO } = req.body;
    const [result] = await db.query(
      'INSERT INTO recurring_income (DATA, RECEITA, VALOR, ATIVO) VALUES (?, ?, ?, ?)',
      [DATA, RECEITA, VALOR, ATIVO === undefined ? 1 : ATIVO]
    );
    res.status(201).json({ id: result.insertId, message: 'Receita recorrente criada com sucesso' });
  } catch (error) {
    console.error('Erro ao criar receita recorrente:', error);
    res.status(500).json({ error: 'Erro ao criar receita recorrente' });
  }
});

// PUT - Atualizar receita recorrente
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { DATA, RECEITA, VALOR, ATIVO } = req.body;
    await db.query(
      'UPDATE recurring_income SET DATA = ?, RECEITA = ?, VALOR = ?, ATIVO = ? WHERE ID = ?',
      [DATA, RECEITA, VALOR, ATIVO === undefined ? 1 : ATIVO, id]
    );
    res.json({ message: 'Receita recorrente atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar receita recorrente:', error);
    res.status(500).json({ error: 'Erro ao atualizar receita recorrente' });
  }
});

// DELETE - Excluir receita recorrente
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM recurring_income WHERE ID = ?', [id]);
    res.json({ message: 'Receita recorrente excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir receita recorrente:', error);
    res.status(500).json({ error: 'Erro ao excluir receita recorrente' });
  }
});

module.exports = router;
