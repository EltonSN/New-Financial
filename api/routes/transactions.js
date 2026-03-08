const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET - Listar todas as transações
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT t.*, c.nome as categoria_nome 
      FROM transactions t
      LEFT JOIN categories c ON t.categoria_id = c.id
      ORDER BY t.DATA DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

// POST - Criar nova transação
router.post('/', async (req, res) => {
  try {
    const { DATA, TIPO, categoria_id, DESCRICAO, VALOR } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO transactions (DATA, TIPO, categoria_id, DESCRICAO, VALOR) VALUES (?, ?, ?, ?, ?)',
      [DATA, TIPO, categoria_id, DESCRICAO, VALOR]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Transação criada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    res.status(500).json({ error: 'Erro ao criar transação' });
  }
});

// PUT - Atualizar transação
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { DATA, TIPO, categoria_id, DESCRICAO, VALOR } = req.body;
    
    await db.query(
      'UPDATE transactions SET DATA = ?, TIPO = ?, categoria_id = ?, DESCRICAO = ?, VALOR = ? WHERE ID = ?',
      [DATA, TIPO, categoria_id, DESCRICAO, VALOR, id]
    );
    
    res.json({ message: 'Transação atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar transação:', error);
    res.status(500).json({ error: 'Erro ao atualizar transação' });
  }
});

// DELETE - Excluir transação
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM transactions WHERE ID = ?', [id]);
    res.json({ message: 'Transação excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir transação:', error);
    res.status(500).json({ error: 'Erro ao excluir transação' });
  }
});

module.exports = router;