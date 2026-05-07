let warnedWeakSecret = false;

const getJwtSecret = () => {
    const secret = process.env.ACCESS_TOKEN || process.env.JWT_SECRET;

    if (!secret) {
        throw new Error('Configure ACCESS_TOKEN ou JWT_SECRET no .env.');
    }

    if (secret.length < 32 && !warnedWeakSecret) {
        warnedWeakSecret = true;
        console.warn('[security] ACCESS_TOKEN/JWT_SECRET deve ter pelo menos 32 caracteres.');
    }

    return secret;
};

module.exports = { getJwtSecret };
