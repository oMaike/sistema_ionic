const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createPool({
    port: Number(process.env.DB_PORT || 3306),
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    charset: 'utf8mb4'
});

connection.getConnection((err, conn) => {
    if (err) {
        console.error('[db] Erro ao conectar ao banco:', err.code || err.message);
        return;
    }

    conn.release();
    console.log('[db] Conectado.');
});

module.exports = connection;
