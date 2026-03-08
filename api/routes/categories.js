const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET - Listar todas as categorias
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY nome');
    res.json(rows);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// POST - Criar nova categoria
router.post('/', async (req, res) => {
  try {
    const { nome } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO categories (nome) VALUES (?)',
      [nome]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Categoria criada com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar categoria:', error);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// PUT - Atualizar categoria
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome } = req.body;
    
    await db.query(
      'UPDATE categories SET nome = ? WHERE id = ?',
      [nome, id]
    );
    
    res.json({ message: 'Categoria atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

// DELETE - Excluir categoria
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
});

module.exports = router;