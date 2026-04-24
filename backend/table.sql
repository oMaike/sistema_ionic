CREATE TABLE user (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  senha VARCHAR(255) NOT NULL,
  perfil ENUM('admin','user1','user2') NOT NULL
);


INSERT INTO user (nome, email, senha, perfil)
VALUES ('Maike', 'maike@gmail.com', 'qwert', 'admin');