const { isAdmin } = require('../middlewares/auth.middleware');

module.exports = { checkRole: isAdmin };
