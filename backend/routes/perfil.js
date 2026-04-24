const express = require('express');
const router = express.Router();
const { query } = require('../utils/dbQuery');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { authenticateToken } = require('../middlewares/auth.middleware');

/**
 * PATCH /update-perfil
 * Atualiza o nome do usuário autenticado.
 */
router.patch('/update-perfil', authenticateToken, asyncHandler(async (req, res) => {
    const { nome } = req.body;

    if (!nome?.trim())
        return res.status(400).json({ message: 'Nome não pode ser vazio.' });

    await query('UPDATE user SET nome = ? WHERE email = ?', [nome.trim(), req.user.email]);
    return res.status(200).json({ message: 'Perfil atualizado com sucesso!' });
}));

/**
 * DELETE /delete-me
 * Exclui a própria conta do usuário autenticado.
 */
router.delete('/delete-me', authenticateToken, asyncHandler(async (req, res) => {
    await query('DELETE FROM user WHERE email = ?', [req.user.email]);
    return res.status(200).json({ message: 'Conta excluída com sucesso.' });
}));

module.exports = router;