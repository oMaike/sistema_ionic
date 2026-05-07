const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authLimiter } = require('../security');
const { query } = require('../utils/dbQuery');
const { getJwtSecret } = require('../utils/jwt');
const {
    isStrongPassword,
    isValidEmail,
    isValidName,
    normalizeEmail,
    normalizeName,
    normalizePublicProfile
} = require('../utils/validators');
const { asyncHandler } = require('../middlewares/asyncHandler');
const {
    enviarEmailNovoUsuario,
    enviarEmailRedefinicaoSenha
} = require('../services/email.service');

const PASSWORD_MESSAGE = 'Senha deve ter no mínimo 8 caracteres, incluindo letras e números.';
const JWT_OPTIONS = { algorithm: 'HS256' };

/**
 * POST /signup
 * Registra um novo usuário e avisa o administrador por e-mail.
 */
router.post('/signup', authLimiter, asyncHandler(async (req, res) => {
    const { nome, email, password, senha, perfil } = req.body;
    const senhaRaw = password || senha;
    const nomeNormalizado = normalizeName(nome);
    const emailNormalizado = normalizeEmail(email);
    const perfilSeguro = normalizePublicProfile(perfil);

    if (!isValidName(nomeNormalizado))
        return res.status(400).json({ message: 'Nome deve ter entre 3 e 100 caracteres.' });
    if (!isValidEmail(emailNormalizado))
        return res.status(400).json({ message: 'E-mail inválido.' });
    if (!isStrongPassword(senhaRaw))
        return res.status(400).json({ message: PASSWORD_MESSAGE });

    const existente = await query('SELECT id FROM user WHERE email = ?', [emailNormalizado]);
    if (existente.length > 0)
        return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });

    const salt = await bcrypt.genSalt(12);
    const senhaHash = await bcrypt.hash(senhaRaw, salt);

    await query(
        'INSERT INTO user (nome, email, senha, aprovado, perfil) VALUES (?, ?, ?, 0, ?)',
        [nomeNormalizado, emailNormalizado, senhaHash, perfilSeguro]
    );

    try {
        await enviarEmailNovoUsuario({ nome: nomeNormalizado, email: emailNormalizado, perfil: perfilSeguro });
    } catch (mailError) {
        console.error('Erro ao enviar e-mail de aviso ao admin:', mailError);
    }

    return res.status(201).json({ message: 'Registrado com sucesso. Aguarde aprovação.' });
}));

/**
 * POST /login
 * Autentica usuário e retorna JWT.
 */
router.post('/login', authLimiter, asyncHandler(async (req, res) => {
    const { email, password, senha } = req.body;
    const senhaRaw = password || senha;
    const emailNormalizado = normalizeEmail(email);

    if (!isValidEmail(emailNormalizado) || !senhaRaw)
        return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });

    const results = await query(
        'SELECT id, nome, email, senha, aprovado, perfil FROM user WHERE email = ?',
        [emailNormalizado]
    );

    if (results.length === 0)
        return res.status(401).json({ message: 'Credenciais inválidas.' });

    const user = results[0];
    const senhaOk = await bcrypt.compare(senhaRaw, user.senha);

    if (!senhaOk)
        return res.status(401).json({ message: 'Credenciais inválidas.' });

    if (user.aprovado !== 1)
        return res.status(403).json({ message: 'Conta indisponível. Aguarde aprovação ou fale com o administrador.' });

    const payload = { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil };
    const accessToken = jwt.sign(payload, getJwtSecret(), { ...JWT_OPTIONS, expiresIn: '8h' });

    return res.status(200).json({ token: accessToken });
}));

/**
 * POST /forgotPassword
 * Envia link de redefinição de senha por e-mail.
 */
router.post('/forgotPassword', authLimiter, asyncHandler(async (req, res) => {
    const emailNormalizado = normalizeEmail(req.body.email);

    if (!isValidEmail(emailNormalizado))
        return res.status(400).json({ message: 'E-mail inválido.' });

    const results = await query('SELECT email FROM user WHERE email = ?', [emailNormalizado]);

    // Sempre retorna 200 para não revelar se o e-mail existe.
    if (results.length === 0)
        return res.status(200).json({ message: 'Se o e-mail existir, o link foi enviado.' });

    const resetToken = jwt.sign({ email: emailNormalizado }, getJwtSecret(), { ...JWT_OPTIONS, expiresIn: '15m' });
    const resetLink = `http://localhost:8100/reset-password?token=${resetToken}`;

    await enviarEmailRedefinicaoSenha({ email: emailNormalizado, resetLink });

    return res.status(200).json({ message: 'Se o e-mail existir, o link foi enviado.' });
}));

/**
 * POST /resetPassword
 * Salva a nova senha a partir do token de redefinição.
 */
router.post('/resetPassword', authLimiter, asyncHandler(async (req, res) => {
    const { token, newPassword, password, senha } = req.body;
    const senhaRaw = newPassword || password || senha;

    if (!token || !senhaRaw)
        return res.status(400).json({ message: 'Dados insuficientes.' });

    if (!isStrongPassword(senhaRaw))
        return res.status(400).json({ message: PASSWORD_MESSAGE });

    try {
        const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
        const emailNormalizado = normalizeEmail(decoded.email);

        if (!isValidEmail(emailNormalizado))
            return res.status(401).json({ message: 'O link de recuperação expirou ou é inválido.' });

        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(senhaRaw, salt);

        const result = await query('UPDATE user SET senha = ? WHERE email = ?', [hashedPassword, emailNormalizado]);

        if (result.affectedRows === 0)
            return res.status(404).json({ message: 'Usuário não encontrado.' });

        return res.status(200).json({ message: 'Senha atualizada com sucesso!' });
    } catch {
        return res.status(401).json({ message: 'O link de recuperação expirou ou é inválido.' });
    }
}));

module.exports = router;
