CREATE TABLE user (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(254) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  aprovado TINYINT(1) NOT NULL DEFAULT 0,
  perfil ENUM('admin','user1','user2') NOT NULL DEFAULT 'user1',
  geolocalizacao_consentida TINYINT(1) NOT NULL DEFAULT 0,
  data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE disciplinas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE aluno_disciplinas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  aluno_id INT NOT NULL,
  disciplina_id INT NOT NULL,
  status ENUM('cursando','concluida') NOT NULL DEFAULT 'cursando',
  UNIQUE KEY uk_aluno_disciplina (aluno_id, disciplina_id),
  CONSTRAINT fk_aluno_disciplina_user
    FOREIGN KEY (aluno_id) REFERENCES user(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_aluno_disciplina_disciplina
    FOREIGN KEY (disciplina_id) REFERENCES disciplinas(id)
    ON DELETE CASCADE
);

CREATE TABLE user_locations (
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
  INDEX idx_user_locations_user_id (user_id),
  INDEX idx_user_locations_captured_at (captured_at),
  CONSTRAINT fk_user_locations_user
    FOREIGN KEY (user_id) REFERENCES user(id)
    ON DELETE CASCADE
);

-- Não insira senhas em texto puro neste arquivo.
-- Para criar um admin inicial, gere um hash bcrypt e insira o valor hash em user.senha.
