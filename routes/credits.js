const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET - Listar todas as faturas
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM credit ORDER BY DATA DESC');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar faturas:', error);
    res.status(500).json({ error: 'Erro ao buscar faturas' });
  }
});

// POST - Criar nova fatura
router.post('/', async (req, res) => {
  try {
    const { DATA, CARTAO, VALOR, PARCELAS, PROXIMO } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO credit (DATA, CARTAO, VALOR, PARCELAS, PROXIMO) VALUES (?, ?, ?, ?, ?)',
      [DATA, CARTAO, VALOR, PARCELAS, PROXIMO]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Fatura criada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar fatura:', error);
    res.status(500).json({ error: 'Erro ao criar fatura' });
  }
});

// PUT - Atualizar fatura
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { DATA, CARTAO, VALOR, PARCELAS, PROXIMO } = req.body;
    
    await db.query(
      'UPDATE credit SET DATA = ?, CARTAO = ?, VALOR = ?, PARCELAS = ?, PROXIMO = ? WHERE ID = ?',
      [DATA, CARTAO, VALOR, PARCELAS, PROXIMO, id]
    );
    
    res.json({ message: 'Fatura atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar fatura:', error);
    res.status(500).json({ error: 'Erro ao atualizar fatura' });
  }
});

// DELETE - Excluir fatura
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM credit WHERE ID = ?', [id]);
    res.json({ message: 'Fatura excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir fatura:', error);
    res.status(500).json({ error: 'Erro ao excluir fatura' });
  }
});

module.exports = router;