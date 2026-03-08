const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET - Listar todos os cartões
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM cards ORDER BY nome');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar cartões:', error);
    res.status(500).json({ error: 'Erro ao buscar cartões' });
  }
});

// POST - Criar novo cartão
router.post('/', async (req, res) => {
  try {
    const { nome, vencimento_dia, limite_total } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO cards (nome, vencimento_dia, limite_total) VALUES (?, ?, ?)',
      [nome, vencimento_dia, limite_total]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Cartão criado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar cartão:', error);
    res.status(500).json({ error: 'Erro ao criar cartão' });
  }
});

// PUT - Atualizar cartão
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, vencimento_dia, limite_total } = req.body;
    
    await db.query(
      'UPDATE cards SET nome = ?, vencimento_dia = ?, limite_total = ? WHERE id = ?',
      [nome, vencimento_dia, limite_total, id]
    );
    
    res.json({ message: 'Cartão atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar cartão:', error);
    res.status(500).json({ error: 'Erro ao atualizar cartão' });
  }
});

// DELETE - Excluir cartão
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM cards WHERE id = ?', [id]);
    res.json({ message: 'Cartão excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir cartão:', error);
    res.status(500).json({ error: 'Erro ao excluir cartão' });
  }
});

module.exports = router;