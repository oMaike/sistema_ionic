const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Verifica se o token JWT é válido e injeta req.user.
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token)
        return res.status(401).json({ message: 'Acesso negado. Faça login.' });

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, user) => {
        if (err)
            return res.status(403).json({ message: 'Token inválido ou expirado.' });
        req.user = user;
        next();
    });
};

/**
 * Garante que o usuário autenticado é administrador.
 * Deve ser usado APÓS authenticateToken.
 */
const isAdmin = (req, res, next) => {
    if (!req.user || req.user.perfil !== 'admin')
        return res.status(403).json({ message: 'Acesso restrito apenas para administradores.' });
    next();
};

module.exports = { authenticateToken, isAdmin };
