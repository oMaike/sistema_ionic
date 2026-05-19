const express = require('express');
const router = express.Router();

router.use(require('./auth.routes'));
router.use(require('./perfil'));
router.use(require('./admin.routes'));
router.use(require('./location.routes'));

// Handler global de erros
router.use((err, req, res, _next) => {
    console.error(`[routes] Erro em ${req.method} ${req.path}:`, err);
    return res.status(500).json({ message: 'Erro interno do servidor.' });
});

module.exports = router;
