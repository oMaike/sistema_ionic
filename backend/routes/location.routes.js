const express = require('express');
const router = express.Router();
const { query } = require('../utils/dbQuery');
const { toPositiveInt } = require('../utils/validators');
const { asyncHandler } = require('../middlewares/asyncHandler');
const { authenticateToken, isAdmin } = require('../middlewares/auth.middleware');
const { ensureLocationSchema } = require('../utils/locationSchema');

const isValidCoordinate = (value, min, max) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= min && number <= max;
};

const normalizeAccuracy = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
};

router.use(authenticateToken);

router.patch('/location/consent', asyncHandler(async (req, res) => {
    await ensureLocationSchema();

    const accepted = req.body.accepted === true || req.body.accepted === 1;
    await query(
        'UPDATE user SET geolocalizacao_consentida = ? WHERE id = ?',
        [accepted ? 1 : 0, req.user.id]
    );

    if (!accepted) {
        await query(
            'UPDATE user_locations SET session_active = 0, last_seen_at = NOW() WHERE user_id = ?',
            [req.user.id]
        );
    }

    return res.status(200).json({ geolocalizacaoConsentida: accepted });
}));

router.post('/location/update', asyncHandler(async (req, res) => {
    await ensureLocationSchema();

    const [user] = await query(
        'SELECT id, geolocalizacao_consentida FROM user WHERE id = ? LIMIT 1',
        [req.user.id]
    );

    if (!user || user.geolocalizacao_consentida !== 1) {
        return res.status(403).json({ message: 'Geolocalização sem consentimento ativo.' });
    }

    const { latitude, longitude, accuracy, source } = req.body;
    if (!isValidCoordinate(latitude, -90, 90) || !isValidCoordinate(longitude, -180, 180)) {
        return res.status(400).json({ message: 'Coordenadas inválidas.' });
    }

    const safeSource = ['manual', 'watch', 'ip'].includes(source) ? source : 'watch';
    const safeUserAgent = String(req.headers['user-agent'] || '').slice(0, 255);

    await query(
        `INSERT INTO user_locations
            (user_id, latitude, longitude, accuracy, source, session_active, user_agent)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [
            req.user.id,
            Number(latitude),
            Number(longitude),
            normalizeAccuracy(accuracy),
            safeSource,
            safeUserAgent
        ]
    );

    return res.status(201).json({ message: 'Localização atualizada.' });
}));

router.post('/location/stop', asyncHandler(async (req, res) => {
    await ensureLocationSchema();

    await query(
        'UPDATE user_locations SET session_active = 0, last_seen_at = NOW() WHERE user_id = ?',
        [req.user.id]
    );

    return res.status(200).json({ message: 'Rastreamento encerrado.' });
}));

router.get('/location/live', isAdmin, asyncHandler(async (_req, res) => {
    await ensureLocationSchema();

    const results = await query(`
        SELECT
            u.id AS userId,
            ul.id AS locationId,
            u.nome,
            u.email,
            u.perfil,
            u.geolocalizacao_consentida AS geolocalizacaoConsentida,
            ul.latitude,
            ul.longitude,
            ul.accuracy,
            ul.source,
            ul.session_active AS sessionActive,
            ul.captured_at AS capturedAt,
            ul.last_seen_at AS lastSeenAt,
            TIMESTAMPDIFF(SECOND, ul.last_seen_at, NOW()) AS segundosSemAtualizar
        FROM user u
        LEFT JOIN (
            SELECT user_id, MAX(id) AS latest_id
            FROM user_locations
            GROUP BY user_id
        ) latest ON latest.user_id = u.id
        LEFT JOIN user_locations ul ON ul.id = latest.latest_id
        WHERE LOWER(u.perfil) != 'admin'
            AND u.aprovado = 1
        ORDER BY ul.captured_at IS NULL, ul.captured_at DESC, u.nome ASC
    `);

    return res.status(200).json(results.map((row) => ({
        ...row,
        geolocalizacaoConsentida: row.geolocalizacaoConsentida === 1,
        hasLocation: row.locationId !== null,
        online: row.locationId !== null &&
            Number(row.sessionActive) === 1 &&
            Number(row.segundosSemAtualizar) <= 120
    })));
}));

router.get('/location/history/:id', isAdmin, asyncHandler(async (req, res) => {
    await ensureLocationSchema();

    const userId = toPositiveInt(req.params.id);
    if (!userId) return res.status(400).json({ message: 'ID inválido.' });

    const results = await query(
        `SELECT
            id,
            latitude,
            longitude,
            accuracy,
            source,
            session_active AS sessionActive,
            captured_at AS capturedAt,
            last_seen_at AS lastSeenAt
         FROM user_locations
         WHERE user_id = ?
         ORDER BY id DESC
         LIMIT 100`,
        [userId]
    );

    return res.status(200).json(results);
}));

module.exports = router;
