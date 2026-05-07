const nodemailer = require('nodemailer');
const { escapeHtml } = require('../utils/validators');
require('dotenv').config();

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:8100';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
});

const safeUser = () => escapeHtml(process.env.EMAIL || '');

const enviarEmailNovoUsuario = async ({ nome, email, perfil }) => {
    const safeNome = escapeHtml(nome);
    const safeEmail = escapeHtml(email);
    const safePerfil = escapeHtml(perfil || 'user1');

    await transporter.sendMail({
        from: safeUser(),
        to: process.env.EMAIL,
        subject: 'Novo usuário aguardando aprovação',
        text: `Novo cadastro aguardando aprovação.\nNome: ${nome}\nE-mail: ${email}\nPerfil: ${perfil || 'user1'}`,
        html: `
            <div style="font-family: sans-serif;">
                <h2>Solicitação de novo cadastro</h2>
                <p>Um novo usuário se registrou e está aguardando sua aprovação no painel.</p>
                <ul>
                    <li><strong>Nome:</strong> ${safeNome}</li>
                    <li><strong>E-mail:</strong> ${safeEmail}</li>
                    <li><strong>Perfil solicitado:</strong> ${safePerfil}</li>
                </ul>
                <a href="${escapeHtml(`${APP_BASE_URL}/admin-panel`)}"
                   style="background-color:#3880ff;color:white;padding:10px 15px;text-decoration:none;border-radius:5px;">
                   Ir para painel admin
                </a>
            </div>
        `
    });
};

const enviarEmailAprovacao = async ({ nome, email }) => {
    const safeNome = escapeHtml(nome);

    await transporter.sendMail({
        from: safeUser(),
        to: email,
        subject: 'Sua conta foi aprovada!',
        text: `Olá, ${nome}. Sua conta foi aprovada. Acesse: ${APP_BASE_URL}/login`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.5;">
                <h3>Olá, ${safeNome}!</h3>
                <p>Temos boas notícias: <strong>sua conta foi aprovada</strong> por um administrador.</p>
                <p>Agora você já pode acessar todas as funcionalidades do sistema.</p>
                <br>
                <a href="${escapeHtml(`${APP_BASE_URL}/login`)}"
                   style="background-color:#3880ff;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">
                   Acessar o sistema
                </a>
            </div>
        `
    });
};

const enviarEmailDesativacao = async ({ nome, email }) => {
    await transporter.sendMail({
        from: safeUser(),
        to: email,
        subject: 'Seu acesso foi desativado',
        text: `Olá, ${nome}. Seu acesso ao sistema foi desativado por um administrador.`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.5;">
                <h3>Olá, ${escapeHtml(nome)}.</h3>
                <p>Informamos que <strong>seu acesso ao sistema foi desativado</strong> por um administrador.</p>
                <p>Se você acredita que isso foi um engano, entre em contato com o suporte.</p>
                <br>
                <p style="color: #999; font-size: 13px;">Você não poderá fazer login enquanto seu acesso estiver desativado.</p>
            </div>
        `
    });
};

const enviarEmailRedefinicaoSenha = async ({ email, resetLink }) => {
    const safeResetLink = escapeHtml(resetLink);

    await transporter.sendMail({
        from: safeUser(),
        to: email,
        subject: 'Redefinição de senha',
        text: `Clique no link abaixo para redefinir sua senha. O link expira em 15 minutos.\n${resetLink}`,
        html: `
            <h3>Redefinição de senha</h3>
            <p>Clique no link abaixo para redefinir sua senha. O link expira em 15 minutos.</p>
            <a href="${safeResetLink}">Redefinir senha</a>
            <p>Se você não solicitou isso, ignore este e-mail.</p>
        `
    });
};

module.exports = {
    enviarEmailNovoUsuario,
    enviarEmailAprovacao,
    enviarEmailDesativacao,
    enviarEmailRedefinicaoSenha
};
