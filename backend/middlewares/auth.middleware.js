const jwt = require('jsonwebtoken');
const { query } = require('../utils/dbQuery');
const { getJwtSecret } = require('../utils/jwt');

/**
 * Verifica se o token JWT é válido e confirma no banco se o usuário ainda
 * existe e está aprovado. Isso evita acesso com token antigo após desativação.
 */
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'Acesso negado. Faça login.' });
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });

        if (!decoded?.id || !decoded?.email) {
            return res.status(403).json({ message: 'Token inválido ou expirado.' });
        }

        const users = await query(
            'SELECT id, nome, email, perfil, aprovado FROM user WHERE id = ? AND email = ? LIMIT 1',
            [decoded.id, decoded.email]
        );

        if (users.length === 0 || users[0].aprovado !== 1) {
            return res.status(403).json({ message: 'Usuário sem acesso ativo.' });
        }

        req.user = {
            id: users[0].id,
            nome: users[0].nome,
            email: users[0].email,
            perfil: users[0].perfil
        };
        next();
    } catch {
        return res.status(403).json({ message: 'Token inválido ou expirado.' });
    }
};

/**
 * Garante que o usuário autenticado é administrador.
 * Deve ser usado após authenticateToken.
 */
const isAdmin = (req, res, next) => {
    if (!req.user || String(req.user.perfil).toLowerCase() !== 'admin') {
        return res.status(403).json({ message: 'Acesso restrito apenas para administradores.' });
    }
    next();
};

module.exports = { authenticateToken, isAdmin };
