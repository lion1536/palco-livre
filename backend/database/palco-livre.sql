CREATE DATABASE palco_livre;
USE palco_livre;

CREATE TABLE instrumentos (
    instrumento_id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50) NOT NULL,
    categoria VARCHAR(30) NOT NULL, 
    marca VARCHAR(20) NOT NULL,
    descricao VARCHAR(255),         
    preco DECIMAL(10,2) NOT NULL,
    estoque INT NOT NULL DEFAULT 0 
);
CREATE TABLE instrumento_imagens (
    imagem_id INT PRIMARY KEY AUTO_INCREMENT,
    instrumento_id INT NOT NULL,
    caminho VARCHAR(255) NOT NULL,
    principal BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (instrumento_id) REFERENCES instrumentos(instrumento_id) ON DELETE CASCADE
);

CREATE TABLE login (
    usuario_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    data_criacao DATE NOT NULL,
    data_att DATE NOT NULL,
    endereco VARCHAR(50)
);

CREATE TABLE usuario_fotos (
    foto_id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    caminho VARCHAR(255) NOT NULL,
    principal BOOLEAN DEFAULT TRUE,
    data_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES login(usuario_id) ON DELETE CASCADE
);


CREATE TABLE compras (
    compra_id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    instrumento_id INT NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    forma_pagamento VARCHAR(20) NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES login(usuario_id),
    FOREIGN KEY (instrumento_id) REFERENCES instrumentos(instrumento_id)
    -- REMOVIDA FOREIGN KEY de preco
);

CREATE TABLE pedidos (
    pedido_id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    compra_id INT NOT NULL,
    status_entrega VARCHAR(20) NOT NULL,
    status_pagamento VARCHAR(20) NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES login(usuario_id),
    FOREIGN KEY (compra_id) REFERENCES compras(compra_id)
);

CREATE TABLE sessions (
    session_id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES login(usuario_id)
);


CREATE TABLE carrinho (
    carrinho_id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    instrumento_id INT NOT NULL,
    quantidade INT NOT NULL,
    data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES login(usuario_id),
    FOREIGN KEY (instrumento_id) REFERENCES instrumentos(instrumento_id)
);


CREATE TABLE pagamentos (
    pagamento_id INT PRIMARY KEY AUTO_INCREMENT,
    pedido_id INT NOT NULL,
    metodo VARCHAR(20) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pendente',
    data_pagamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(pedido_id)
);
