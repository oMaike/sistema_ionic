require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();

// Middlewares globais
app.use(cors());
app.use(express.json());

// Rotas
const userRoutes = require('./routes/index');
app.use('/user', userRoutes);

// Servidor
const server = http.createServer(app);
server.listen(process.env.PORT || 9090, () => {
    console.log(`Servidor rodando na porta ${process.env.PORT || 9090}`);
});