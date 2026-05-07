const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PUBLIC_PROFILES = new Set(['user1', 'user2']);

const normalizeEmail = (email) =>
    typeof email === 'string' ? email.trim().toLowerCase() : '';

const isValidEmail = (email) => {
    const normalized = normalizeEmail(email);
    return normalized.length <= 254 && EMAIL_REGEX.test(normalized);
};

const normalizeName = (nome) =>
    typeof nome === 'string' ? nome.trim().replace(/\s+/g, ' ') : '';

const isValidName = (nome) => {
    const normalized = normalizeName(nome);
    return normalized.length >= 3 && normalized.length <= 100;
};

const isStrongPassword = (senha) =>
    typeof senha === 'string' &&
    senha.length >= 8 &&
    /[A-Za-z]/.test(senha) &&
    /\d/.test(senha);

const normalizePublicProfile = (perfil) => {
    const normalized = typeof perfil === 'string' ? perfil.trim().toLowerCase() : '';
    return PUBLIC_PROFILES.has(normalized) ? normalized : 'user1';
};

const toPositiveInt = (value) => {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const escapeHtml = (value) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

module.exports = {
    escapeHtml,
    isStrongPassword,
    isValidEmail,
    isValidName,
    normalizeEmail,
    normalizeName,
    normalizePublicProfile,
    toPositiveInt
};
