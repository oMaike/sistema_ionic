const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

/**
 * Avisa o admin que um novo usuário se cadastrou e aguarda aprovação.
 */
const enviarEmailNovoUsuario = async ({ nome, email, perfil }) => {
    await transporter.sendMail({
        from: process.env.EMAIL,
        to: process.env.EMAIL,
        subject: 'Novo Usuário Aguardando Aprovação',
        html: `
            <div style="font-family: sans-serif;">
                <h2>Solicitação de Novo Cadastro</h2>
                <p>Um novo usuário se registrou e está aguardando sua aprovação no painel.</p>
                <ul>
                    <li><strong>Nome:</strong> ${nome}</li>
                    <li><strong>E-mail:</strong> ${email}</li>
                    <li><strong>Perfil solicitado:</strong> ${perfil || 'user1'}</li>
                </ul>
                <a href="http://localhost:8100/admin-panel"
                   style="background-color:#2dd36f;color:white;padding:10px 15px;text-decoration:none;border-radius:5px;">
                   Ir para Painel Admin
                </a>
            </div>
        `
    });
};

/**
 * Notifica o usuário que sua conta foi aprovada pelo admin.
 */
const enviarEmailAprovacao = async ({ nome, email }) => {
    await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: 'Sua conta foi aprovada!',
        html: `
            <div style="font-family: sans-serif; line-height: 1.5;">
                <h3>Olá, ${nome}!</h3>
                <p>Temos boas notícias: <strong>sua conta foi aprovada</strong> por um administrador.</p>
                <p>Agora você já pode acessar todas as funcionalidades do sistema.</p>
                <br>
                <a href="http://localhost:8100/login"
                   style="background-color:#3880ff;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">
                   Acessar o Sistema
                </a>
                <br><br>
                <p>Seja bem-vindo!</p>
            </div>
        `
    });
};

/**
 * Envia link de redefinição de senha para o usuário.
 */
const enviarEmailRedefinicaoSenha = async ({ email, resetLink }) => {
    await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: 'Redefinição de Senha',
        html: `
            <h3>Redefinição de Senha</h3>
            <p>Clique no link abaixo para redefinir sua senha. O link expira em 15 minutos.</p>
            <a href="${resetLink}">Redefinir Senha</a>
            <p>Se você não solicitou isso, ignore este e-mail.</p>
        `
    });
};

module.exports = {
    enviarEmailNovoUsuario,
    enviarEmailAprovacao,
    enviarEmailRedefinicaoSenha
};