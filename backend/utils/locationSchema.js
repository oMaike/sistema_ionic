const { query } = require('./dbQuery');

let ensured = false;

const ignoreDuplicateColumn = (err) => {
    if (err && err.code !== 'ER_DUP_FIELDNAME') throw err;
};

const ensureLocationSchema = async () => {
    if (ensured) return;

    try {
        await query(
            'ALTER TABLE user ADD COLUMN geolocalizacao_consentida TINYINT(1) NOT NULL DEFAULT 0'
        );
    } catch (err) {
        ignoreDuplicateColumn(err);
    }

    await query(`
        CREATE TABLE IF NOT EXISTS user_locations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            latitude DECIMAL(10,7) NOT NULL,
            longitude DECIMAL(10,7) NOT NULL,
            accuracy DECIMAL(10,2) NULL,
            source ENUM('watch','manual','ip') NOT NULL DEFAULT 'watch',
            session_active TINYINT(1) NOT NULL DEFAULT 1,
            captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            user_agent VARCHAR(255) NULL,
            CONSTRAINT fk_user_locations_user
                FOREIGN KEY (user_id) REFERENCES user(id)
                ON DELETE CASCADE,
            INDEX idx_user_locations_user_id (user_id),
            INDEX idx_user_locations_captured_at (captured_at)
        )
    `);

    await query(
        "ALTER TABLE user_locations MODIFY COLUMN source ENUM('watch','manual','ip') NOT NULL DEFAULT 'watch'"
    );

    ensured = true;
};

module.exports = { ensureLocationSchema };
