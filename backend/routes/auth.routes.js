const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../utils/dbQuery');
const { isValidEmail } = require('../utils/validators');
const { asyncHandler } = require('../middlewares/asyncHandler');
const {
    enviarEmailNovoUsuario,
    enviarEmailRedefinicaoSenha
} = require('../services/email.service');
require('dotenv').config();

/**
 * POST /signup
 * Registra um novo usuário e avisa o administrador por e-mail.
 */
router.post('/signup', asyncHandler(async (req, res) => {
    const { nome, email, password, senha, perfil } = req.body;
    const senhaRaw = password || senha;

    if (!nome?.trim())
        return res.status(400).json({ message: 'Nome é obrigatório.' });
    if (!isValidEmail(email))
        return res.status(400).json({ message: 'E-mail inválido.' });
    if (!senhaRaw || senhaRaw.length < 6)
        return res.status(400).json({ message: 'Senha deve ter no mínimo 6 caracteres.' });

    const existente = await query('SELECT id FROM user WHERE email = ?', [email]);
    if (existente.length > 0)
        return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senhaRaw, salt);

    await query(
        'INSERT INTO user (nome, email, senha, aprovado, perfil) VALUES (?, ?, ?, 0, ?)',
        [nome.trim(), email.toLowerCase(), senhaHash, perfil || 'user1']
    );

    try {
        await enviarEmailNovoUsuario({ nome, email, perfil });
    } catch (mailError) {
        console.error('Erro ao enviar e-mail de aviso ao admin:', mailError);
    }

    return res.status(201).json({ message: 'Registrado com sucesso. Aguarde aprovação.' });
}));

/**
 * POST /login
 * Autentica usuário e retorna JWT.
 */
router.post('/login', asyncHandler(async (req, res) => {
    const { email, password, senha } = req.body;
    const senhaRaw = password || senha;

    if (!email || !senhaRaw)
        return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });

    const results = await query(
        'SELECT id, nome, email, senha, aprovado, perfil FROM user WHERE email = ?',
        [email.toLowerCase()]
    );

    if (results.length === 0)
        return res.status(401).json({ message: 'Credenciais inválidas.' });

    const user = results[0];
    const senhaOk = await bcrypt.compare(senhaRaw, user.senha);

    if (!senhaOk)
        return res.status(401).json({ message: 'Credenciais inválidas.' });

    if (user.aprovado === 0)
        return res.status(403).json({ message: 'Aguarde aprovação do administrador.' });

    const payload = { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil };
    const accessToken = jwt.sign(payload, process.env.ACESS_TOKEN, { expiresIn: '8h' });

    return res.status(200).json({ token: accessToken });
}));

/**
 * POST /forgotPassword
 * Envia link de redefinição de senha por e-mail.
 */
router.post('/forgotPassword', asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!isValidEmail(email))
        return res.status(400).json({ message: 'E-mail inválido.' });

    const results = await query('SELECT email FROM user WHERE email = ?', [email.toLowerCase()]);

    // Sempre retorna 200 para não revelar se o e-mail existe (segurança)
    if (results.length === 0)
        return res.status(200).json({ message: 'Se o e-mail existir, o link foi enviado.' });

    const resetToken = jwt.sign({ email }, process.env.ACESS_TOKEN, { expiresIn: '15m' });
    const resetLink = `http://localhost:8100/reset-password?token=${resetToken}`;

    await enviarEmailRedefinicaoSenha({ email, resetLink });

    return res.status(200).json({ message: 'Se o e-mail existir, o link foi enviado.' });
}));

/**
 * POST /resetPassword
 * Salva a nova senha a partir do token de redefinição.
 */
router.post('/resetPassword', asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword)
        return res.status(400).json({ message: 'Dados insuficientes.' });

    try {
        const decoded = jwt.verify(token, process.env.ACESS_TOKEN);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await query('UPDATE user SET senha = ? WHERE email = ?', [hashedPassword, decoded.email]);

        return res.status(200).json({ message: 'Senha atualizada com sucesso!' });
    } catch {
        return res.status(401).json({ message: 'O link de recuperação expirou ou é inválido.' });
    }
}));

module.exports = router;