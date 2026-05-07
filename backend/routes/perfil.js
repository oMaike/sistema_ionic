const express = require('express');
const router = express.Router();
const { query } = require('../utils/dbQuery');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { isValidName, normalizeName } = require('../utils/validators');

/**
 * PATCH /update-perfil
 * Atualiza o nome do usuário autenticado.
 */
router.patch('/update-perfil', authenticateToken, asyncHandler(async (req, res) => {
    const nome = normalizeName(req.body.nome);

    if (!isValidName(nome))
        return res.status(400).json({ message: 'Nome deve ter entre 3 e 100 caracteres.' });

    await query('UPDATE user SET nome = ? WHERE id = ?', [nome, req.user.id]);
    return res.status(200).json({ message: 'Perfil atualizado com sucesso!' });
}));

/**
 * DELETE /delete-me
 * Exclui a própria conta do usuário autenticado.
 */
router.delete('/delete-me', authenticateToken, asyncHandler(async (req, res) => {
    await query('DELETE FROM user WHERE id = ?', [req.user.id]);
    return res.status(200).json({ message: 'Conta excluída com sucesso.' });
}));

module.exports = router;
