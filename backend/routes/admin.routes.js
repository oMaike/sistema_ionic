const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { query } = require('../utils/dbQuery');
const { isValidEmail } = require('../utils/validators');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const {
    enviarEmailAprovacao,
    enviarEmailDesativacao
} = require('../services/email.service');

// Todas as rotas admin exigem token + perfil admin
router.use(authenticateToken, isAdmin);

// ── Aprovações ───────────────────────────────────────────────────

/**
 * GET /pendentes
 */
router.get('/pendentes', asyncHandler(async (req, res) => {
    const results = await query(
        'SELECT id, nome, email, perfil FROM user WHERE aprovado = 0 ORDER BY id DESC'
    );
    return res.status(200).json(results);
}));

/**
 * PATCH /aprovar
 */
router.patch('/aprovar', asyncHandler(async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: 'ID é obrigatório.' });

    const users = await query('SELECT nome, email FROM user WHERE id = ?', [id]);
    if (users.length === 0)
        return res.status(404).json({ message: 'Usuário não encontrado.' });

    await query('UPDATE user SET aprovado = 1 WHERE id = ?', [id]);

    try {
        await enviarEmailAprovacao(users[0]);
        return res.status(200).json({ message: 'Usuário aprovado e e-mail enviado!' });
    } catch (mailError) {
        console.error('Erro ao enviar e-mail de aprovação:', mailError);
        return res.status(200).json({ message: 'Usuário aprovado, mas falha ao enviar e-mail.' });
    }
}));

/**
 * PATCH /desativar
 * Desativa o acesso de um usuário e envia e-mail de notificação.
 */
router.patch('/desativar', asyncHandler(async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: 'ID é obrigatório.' });

    const users = await query('SELECT nome, email, aprovado FROM user WHERE id = ?', [id]);
    if (users.length === 0)
        return res.status(404).json({ message: 'Usuário não encontrado.' });

    const novoStatus = users[0].aprovado === 1 ? 0 : 1;
    await query('UPDATE user SET aprovado = ? WHERE id = ?', [novoStatus, id]);

    if (novoStatus === 0) {
        try {
            await enviarEmailDesativacao(users[0]);
        } catch (mailError) {
            console.error('Erro ao enviar e-mail de desativação:', mailError);
        }
        return res.status(200).json({ message: 'Acesso desativado e usuário notificado por e-mail.' });
    }

    return res.status(200).json({ message: 'Acesso reativado com sucesso.' });
}));

/**
 * DELETE /delete/:id
 */
router.delete('/delete/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await query('DELETE FROM user WHERE id = ?', [id]);
    if (result.affectedRows === 0)
        return res.status(404).json({ message: 'Usuário não encontrado.' });
    return res.status(200).json({ message: 'Usuário removido com sucesso.' });
}));

// ── Estudantes / CRUD ─────────────────────────────────────────────

router.get('/estudantes-com-disciplinas', asyncHandler(async (req, res) => {
    const results = await query(`
        SELECT
            u.id, u.nome, u.email, u.aprovado,
            GROUP_CONCAT(d.nome ORDER BY d.nome SEPARATOR ', ') AS disciplinas
        FROM user u
        LEFT JOIN aluno_disciplinas ad ON u.id = ad.aluno_id
        LEFT JOIN disciplinas d ON ad.disciplina_id = d.id
        WHERE u.perfil != 'admin'
        GROUP BY u.id, u.nome, u.email, u.aprovado
        ORDER BY u.nome ASC
    `);
    return res.status(200).json(results);
}));

router.post('/criar', asyncHandler(async (req, res) => {
    const { nome, email } = req.body;
    if (!nome?.trim()) return res.status(400).json({ message: 'Nome é obrigatório.' });
    if (!isValidEmail(email)) return res.status(400).json({ message: 'E-mail inválido.' });

    const existente = await query('SELECT id FROM user WHERE email = ?', [email.toLowerCase()]);
    if (existente.length > 0)
        return res.status(409).json({ message: 'E-mail já cadastrado.' });

    const senhaHash = await bcrypt.hash('trocar123', 10);
    const result = await query(
        'INSERT INTO user (nome, email, senha, aprovado, perfil) VALUES (?, ?, ?, 1, ?)',
        [nome.trim(), email.toLowerCase(), senhaHash, 'user1']
    );
    return res.status(201).json({ id: result.insertId, nome: nome.trim(), email });
}));

router.put('/atualizar/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nome, email } = req.body;
    if (!nome?.trim()) return res.status(400).json({ message: 'Nome é obrigatório.' });
    if (email && !isValidEmail(email)) return res.status(400).json({ message: 'E-mail inválido.' });

    if (email) {
        const conflito = await query(
            'SELECT id FROM user WHERE email = ? AND id != ?',
            [email.toLowerCase(), id]
        );
        if (conflito.length > 0)
            return res.status(409).json({ message: 'E-mail já está em uso.' });
    }

    const sql = email ? 'UPDATE user SET nome = ?, email = ? WHERE id = ?' : 'UPDATE user SET nome = ? WHERE id = ?';
    const params = email ? [nome.trim(), email.toLowerCase(), id] : [nome.trim(), id];
    const result = await query(sql, params);
    if (result.affectedRows === 0)
        return res.status(404).json({ message: 'Usuário não encontrado.' });
    return res.status(200).json({ message: 'Usuário atualizado com sucesso.' });
}));

// ── Disciplinas ───────────────────────────────────────────────────

router.get('/disciplinas/:alunoId', asyncHandler(async (req, res) => {
    const results = await query(`
        SELECT d.id, d.nome, ad.status
        FROM disciplinas d
        INNER JOIN aluno_disciplinas ad ON d.id = ad.disciplina_id
        WHERE ad.aluno_id = ?
        ORDER BY ad.status ASC, d.nome ASC
    `, [req.params.alunoId]);
    return res.status(200).json(results);
}));

router.post('/disciplinas/:alunoId', asyncHandler(async (req, res) => {
    const { alunoId } = req.params;
    const { nome, status = 'cursando' } = req.body;
    if (!nome?.trim()) return res.status(400).json({ message: 'Nome da disciplina é obrigatório.' });
    if (!['cursando', 'concluida'].includes(status))
        return res.status(400).json({ message: 'Status inválido.' });

    let disciplinas = await query('SELECT id FROM disciplinas WHERE nome = ?', [nome.trim()]);
    let disciplinaId;
    if (disciplinas.length === 0) {
        const insert = await query('INSERT INTO disciplinas (nome) VALUES (?)', [nome.trim()]);
        disciplinaId = insert.insertId;
    } else {
        disciplinaId = disciplinas[0].id;
    }

    const jaVinculada = await query(
        'SELECT id FROM aluno_disciplinas WHERE aluno_id = ? AND disciplina_id = ?',
        [alunoId, disciplinaId]
    );
    if (jaVinculada.length > 0)
        return res.status(409).json({ message: 'Disciplina já vinculada a este aluno.' });

    await query(
        'INSERT INTO aluno_disciplinas (aluno_id, disciplina_id, status) VALUES (?, ?, ?)',
        [alunoId, disciplinaId, status]
    );
    return res.status(201).json({ disciplinaId, nome: nome.trim(), status });
}));

router.patch('/disciplinas/:alunoId/:disciplinaId', asyncHandler(async (req, res) => {
    const { alunoId, disciplinaId } = req.params;
    const { status } = req.body;
    if (!['cursando', 'concluida'].includes(status))
        return res.status(400).json({ message: 'Status inválido.' });
    const result = await query(
        'UPDATE aluno_disciplinas SET status = ? WHERE aluno_id = ? AND disciplina_id = ?',
        [status, alunoId, disciplinaId]
    );
    if (result.affectedRows === 0)
        return res.status(404).json({ message: 'Vínculo não encontrado.' });
    return res.status(200).json({ message: 'Status atualizado.' });
}));

router.delete('/disciplinas/:alunoId/:disciplinaId', asyncHandler(async (req, res) => {
    const { alunoId, disciplinaId } = req.params;
    const result = await query(
        'DELETE FROM aluno_disciplinas WHERE aluno_id = ? AND disciplina_id = ?',
        [alunoId, disciplinaId]
    );
    if (result.affectedRows === 0)
        return res.status(404).json({ message: 'Vínculo não encontrado.' });
    return res.status(200).json({ message: 'Disciplina removida do aluno.' });
}));

// ── Estatísticas ──────────────────────────────────────────────────

router.get('/estatisticas', asyncHandler(async (req, res) => {
    const [rowAprovados] = await query(
        "SELECT COUNT(*) AS total FROM user WHERE aprovado = 1 AND perfil != 'admin'"
    );
    const [rowPendentes] = await query(
        'SELECT COUNT(*) AS total FROM user WHERE aprovado = 0'
    );

    let meses = [], contagem = [];
    try {
        const mensal = await query(`
            SELECT DATE_FORMAT(data_criacao, '%b/%Y') AS mes, COUNT(*) AS quantidade
            FROM user
            WHERE data_criacao >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY YEAR(data_criacao), MONTH(data_criacao)
            ORDER BY data_criacao ASC
        `);
        meses = mensal.map(r => r.mes);
        contagem = mensal.map(r => r.quantidade);
    } catch (_) {}

    return res.status(200).json({
        aprovados: rowAprovados.total,
        pendentes: rowPendentes.total,
        meses,
        contagem
    });
}));

module.exports = router;
