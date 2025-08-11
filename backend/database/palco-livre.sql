CREATE DATABASE palco_livre;
USE palco_livre;

CREATE TABLE instrumentos (
    instrumento_id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(50) NOT NULL,
    categoria VARCHAR(10) NOT NULL,
    marca VARCHAR(20) NOT NULL,
    descricao VARCHAR(100),
    preco DEC NOT NULL
);

CREATE TABLE login (
    usuario_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(20) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    data_criacao DATE NOT NULL,
    data_att DATE NOT NULL,
    endereco VARCHAR(50)
);

CREATE TABLE compras (
    compra_id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    instrumento_id INT NOT NULL,
    preco DEC NOT NULL,
    forma_pagamento VARCHAR(20) NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES login(usuario_id),
    FOREIGN KEY (instrumento_id) REFERENCES instrumentos(instrumento_id),
    FOREIGN KEY (preco) REFERENCES instrumentos(preco)
);

CREATE TABLE pedidos (
    pedido_id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    compra_id INT NOT NULL,
    status_entrega VARCHAR(20) NOT NULL,
    status_pagamento VARCHAR(20) NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES login(usuario_id),
    FOREIGN KEY (compra_id) REFERENCES compras(compra_id)
)

CREATE TABLE sessions (
    session_id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    data_criacao DATETIME NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES login(usuario_id)
);

CREATE TABLE carrinho (
    carrinho_id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    instrumento_id INT NOT NULL,
    quantidade INT NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES login(usuario_id),
    FOREIGN KEY (instrumento_id) REFERENCES instrumentos(instrumento_id)
);
