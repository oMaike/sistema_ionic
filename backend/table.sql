CREATE TABLE user (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(254) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  aprovado TINYINT(1) NOT NULL DEFAULT 0,
  perfil ENUM('admin','user1','user2') NOT NULL DEFAULT 'user1',
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

-- Não insira senhas em texto puro neste arquivo.
-- Para criar um admin inicial, gere um hash bcrypt e insira o valor hash em user.senha.
