/**
 * Wrapper assíncrono — evita try/catch repetido em cada rota.
 */
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { asyncHandler };