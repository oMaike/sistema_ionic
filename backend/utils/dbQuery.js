const connection = require('../connection');

/**
 * Executa uma query MySQL como Promise, eliminando callback hell.
 */
const query = (sql, params = []) =>
    new Promise((resolve, reject) =>
        connection.query(sql, params, (err, results) =>
            err ? reject(err) : resolve(results)
        )
    );

module.exports = { query };