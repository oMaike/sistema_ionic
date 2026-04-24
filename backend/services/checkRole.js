// services/checkRole.js

function checkRole(req, res, next) {
    // 1. Verificamos se os dados do usuário existem no res.locals
    // 2. Verificamos se o perfil é 'admin'
    if (res.locals.user && res.locals.user.perfil === 'admin') {
        next(); // É admin! Pode seguir para a rota.
    } else {
        // Se for user1, user2 ou user3, ele cai aqui e é barrado
        return res.status(401).json({ message: "Acesso negado. Rota exclusiva para administradores." });
    }
}

module.exports = { checkRole: checkRole };