const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:8100',
    'http://127.0.0.1:8100',
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'capacitor://localhost',
    'ionic://localhost'
];

const DEV_ORIGIN_PATTERNS = [
    /^http:\/\/localhost(?::\d+)?$/,
    /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
    /^http:\/\/0\.0\.0\.0(?::\d+)?$/,
    /^http:\/\/\[::1\](?::\d+)?$/,
    /^http:\/\/10(?:\.\d{1,3}){3}(?::\d+)?$/,
    /^http:\/\/192\.168(?:\.\d{1,3}){2}(?::\d+)?$/,
    /^http:\/\/172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}(?::\d+)?$/
];

const parseAllowedOrigins = () => {
    const raw = process.env.CORS_ORIGINS;
    if (!raw) return DEFAULT_ALLOWED_ORIGINS;

    return raw
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
};

const isOriginAllowed = (origin) => {
    if (!origin) return true;

    const allowedOrigins = parseAllowedOrigins();
    if (allowedOrigins.includes(origin)) return true;

    if (process.env.NODE_ENV !== 'production') {
        return DEV_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
    }

    return false;
};

const corsOptions = {
    origin(origin, callback) {
        if (isOriginAllowed(origin)) {
            return callback(null, true);
        }

        console.warn(`[security] CORS bloqueou a origem: ${origin}`);
        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Muitas requisicoes. Tente novamente em alguns minutos.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }
});

const applySecurity = (app) => {
    app.disable('x-powered-by');
    app.use(helmet());
    app.use(cors(corsOptions));
    app.use(apiLimiter);
};

module.exports = { applySecurity, authLimiter };
