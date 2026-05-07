require('dotenv').config();
const express = require('express');
const http = require('http');
const { applySecurity } = require('./security');

const app = express();

// Middlewares globais
applySecurity(app);
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));

// Rotas
const userRoutes = require('./routes/index');
app.use('/user', userRoutes);

// Servidor
const server = http.createServer(app);
server.listen(process.env.PORT || 9090, () => {
    console.log(`Servidor rodando na porta ${process.env.PORT || 9090}`);
});
