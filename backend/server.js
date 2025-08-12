import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const IP_ADDRESS = process.env.IP_ADDRESS || "0.0.0.0";

const allowedOrigins = ["http://localhost:3000"];
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Middleware para aceitar JSON
app.use(express.json());

// Configuração CORS
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error("CORS não permitido"), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "DELETE", "PUT"],
  })
);

// Pool de conexão MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD?.replace(/"/g, ""),
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Middleware de autenticação JWT + verificação de sessão no banco
async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token não fornecido" });

  try {
    // Verifica se token está ativo na tabela sessions
    const [rows] = await pool.query("SELECT * FROM sessions WHERE token = ?", [
      token,
    ]);
    if (rows.length === 0)
      return res.status(403).json({ error: "Sessão inválida ou expirada" });

    // Verifica JWT
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      req.user = user; // adiciona dados do usuário à requisição
      next();
    } catch (err) {
      return res.status(403).json({ error: "Token inválido" });
    }
  } catch (err) {
    console.error("Erro na autenticação:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
}

// Rota cadastro (protegida por token)
app.post("/cadastro", authenticateToken, async (req, res) => {
  try {
    const { email, senha, endereco } = req.body;

    if (!email || !senha || !endereco) {
      return res
        .status(400)
        .json({ error: "Preencha todos os campos obrigatórios." });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Email inválido." });
    }

    const [existing] = await pool.query("SELECT * FROM login WHERE email = ?", [
      email,
    ]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email já cadastrado." });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const dataAtual = new Date();

    const [result] = await pool.query(
      "INSERT INTO login (email, senha_hash, data_criacao, data_att, endereco) VALUES (?, ?, ?, ?, ?)",
      [email, senhaHash, dataAtual, dataAtual, endereco]
    );

    const usuarioId = result.insertId;
    const token = jwt.sign({ usuarioId, email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    await pool.query(
      "INSERT INTO sessions (usuario_id, token, data_criacao) VALUES (?, ?, ?)",
      [usuarioId, token, dataAtual]
    );

    res.status(201).json({ message: "Usuário cadastrado com sucesso!", token });
  } catch (err) {
    console.error("Erro no cadastro:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Rota login (gera token)
app.post("/login", async (req, res) => {
  try {
    // Verifica se o corpo da requisição existe e tem email e senha
    if (!req.body) {
      return res.status(400).json({ error: "Corpo da requisição vazio." });
    }

    const { email, senha } = req.body;

    if (typeof email !== "string" || typeof senha !== "string") {
      return res
        .status(400)
        .json({ error: "Email e senha devem ser strings." });
    }

    if (!email.trim() || !senha.trim()) {
      return res.status(400).json({ error: "Informe email e senha." });
    }

    // Busca usuário pelo email
    const [rows] = await pool.query("SELECT * FROM login WHERE email = ?", [
      email.trim(),
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ error: "Email ou senha inválidos." });
    }

    const usuario = rows[0];

    // Compara senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: "Email ou senha inválidos." });
    }

    // Gera token JWT
    const token = jwt.sign(
      { usuarioId: usuario.usuario_id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const dataAtual = new Date();

    // Salva sessão no banco
    await pool.query(
      "INSERT INTO sessions (usuario_id, token, data_criacao) VALUES (?, ?, ?)",
      [usuario.usuario_id, token, dataAtual]
    );

    // Retorna apenas dados essenciais do usuário e token
    res.status(200).json({
      message: "Login realizado com sucesso!",
      usuario: {
        id: usuario.usuario_id,
        email: usuario.email,
      },
      token,
    });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Rota adicionar item ao carrinho
app.post("/carrinho", authenticateToken, async (req, res) => {
  try {
    const { instrumentoId, quantidade } = req.body;

    if (!instrumentoId || !quantidade) {
      return res
        .status(400)
        .json({ error: "Instrumento e quantidade são obrigatórios." });
    }

    await pool.query(
      "INSERT INTO carrinho (usuario_id, instrumento_id, quantidade) VALUES (?, ?, ?)",
      [req.user.usuarioId, instrumentoId, quantidade]
    );

    res.status(201).json({ message: "Item adicionado ao carrinho!" });
  } catch (err) {
    console.error("Erro ao adicionar no carrinho:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Rota remover item do carrinho
app.delete("/carrinho/:itemId", authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const id = parseInt(itemId, 10);

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "ID do item inválido." });
    }

    console.log("Usuário autenticado:", req.user);
    console.log(
      "Tentando deletar carrinho_id:",
      id,
      "do usuário:",
      req.user.usuarioId
    );

    const [rows] = await pool.query(
      "SELECT * FROM carrinho WHERE carrinho_id = ? AND usuario_id = ?",
      [id, req.user.usuarioId]
    );

    console.log("SELECT rows:", rows);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Item não encontrado no seu carrinho." });
    }

    const [result] = await pool.query(
      "DELETE FROM carrinho WHERE carrinho_id = ? AND usuario_id = ?",
      [id, req.user.usuarioId]
    );

    console.log("DELETE affectedRows:", result.affectedRows);

    res.status(200).json({ message: "Item removido do carrinho com sucesso!" });
  } catch (err) {
    console.error("Erro ao remover item do carrinho:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Rota para listar itens do carrinho (opcional)
app.get("/carrinho", authenticateToken, async (req, res) => {
  try {
    const [items] = await pool.query(
      `SELECT c.carrinho_id, c.quantidade, i.nome, i.categoria, i.marca, i.descricao, i.preco
       FROM carrinho c
       JOIN instrumentos i ON c.instrumento_id = i.instrumento_id
       WHERE c.usuario_id = ?`,
      [req.user.usuarioId]
    );

    res.status(200).json({ carrinho: items });
  } catch (err) {
    console.error("Erro ao listar itens do carrinho:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

app.get("/buscar", async (req, res) => {
  try {
    // Pega filtros da query da string
    const { nome, categoria, marca } = req.query;

    // Monta filtro dinâmico e parâmetros da consulta
    let filtros = [];
    let params = [];

    if (nome) {
      filtros.push("nome LIKE ?");
      params.push(`%${nome}%`);
    }
    if (categoria) {
      filtros.push("categoria = ?");
      params.push(categoria);
    }
    if (marca) {
      filtros.push("marca = ?");
      params.push(marca);
    }

    const whereClause =
      filtros.length > 0 ? "WHERE " + filtros.join(" AND ") : "";

    const [rows] = await pool.query(
      `SELECT * FROM instrumentos ${whereClause}`,
      params
    );

    res.status(200).json({ resultados: rows });
  } catch (error) {
    console.error("Erro na busca GET:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

app.post("/buscar", async (req, res) => {
  try {
    const { nome, categoria, marca, preco_min, preco_max } = req.body;

    let filtros = [];
    let params = [];

    if (nome) {
      filtros.push("nome LIKE ?");
      params.push(`%${nome}%`);
    }
    if (categoria) {
      filtros.push("categoria = ?");
      params.push(categoria);
    }
    if (marca) {
      filtros.push("marca = ?");
      params.push(marca);
    }

    const precoMin = preco_min != null ? Number(preco_min) : null;
    const precoMax = preco_max != null ? Number(preco_max) : null;

    if (preco_min != null && isNaN(precoMin)) {
      return res.status(400).json({ error: "preco_min inválido" });
    }
    if (preco_max != null && isNaN(precoMax)) {
      return res.status(400).json({ error: "preco_max inválido" });
    }

    if (precoMin !== null) {
      filtros.push("preco >= ?");
      params.push(precoMin);
    }
    if (precoMax !== null) {
      filtros.push("preco <= ?");
      params.push(precoMax);
    }

    const whereClause =
      filtros.length > 0 ? "WHERE " + filtros.join(" AND ") : "";

    const [rows] = await pool.query(
      `SELECT * FROM instrumentos ${whereClause}`,
      params
    );

    res.status(200).json({ resultados: rows });
  } catch (err) {
    console.error("Erro na busca POST:", err.stack || err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Listar todos os instrumentos disponíveis
app.get("/instrumentos", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM instrumentos");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erro ao buscar instrumentos:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Buscar instrumento por ID
app.get("/instrumentos/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM instrumentos WHERE instrumento_id = ?",
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Instrumento não encontrado." });
    }
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Erro ao buscar instrumento:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Aidionar novo instrumento (protegida)
app.post("/instrumentos", authenticateToken, async (req, res) => {
  try {
    const { nome, categoria, marca, descricao, preco, estoque } = req.body;

    if (!nome || !categoria || !marca || !preco || estoque == null) {
      return res
        .status(400)
        .json({ error: "Preencha todos os campos obrigatórios." });
    }

    const [result] = await pool.query(
      "INSERT INTO instrumentos (nome, categoria, marca, descricao, preco, estoque) VALUES (?, ?, ?, ?, ?, ?)",
      [nome, categoria, marca, descricao || null, preco, estoque]
    );

    res.status(201).json({
      message: "Instrumento adicionado com sucesso!",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Erro ao adicionar instrumento:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Atualizar instrumento (protegida)
app.put("/instrumentos/:id", authenticateToken, async (req, res) => {
  try {
    const { nome, categoria, marca, descricao, preco, estoque } = req.body;

    const [result] = await pool.query(
      "UPDATE instrumentos SET nome=?, categoria=?, marca=?, descricao=?, preco=?, estoque=? WHERE instrumento_id=?",
      [nome, categoria, marca, descricao, preco, estoque, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Instrumento não encontrado." });
    }

    res.status(200).json({ message: "Instrumento atualizado com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar instrumento:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Remover instrumento (protegida)
app.delete("/instrumentos/:id", authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM instrumentos WHERE instrumento_id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Instrumento não encontrado." });
    }

    res.status(200).json({ message: "Instrumento removido com sucesso!" });
  } catch (err) {
    console.error("Erro ao remover instrumento:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Criar um novo pedido
app.post("/pedidos", authenticateToken, async (req, res) => {
  try {
    const { compra_id, status_entrega, status_pagamento } = req.body;

    if (!compra_id || !status_entrega || !status_pagamento) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios." });
    }

    const [result] = await pool.query(
      `INSERT INTO pedidos (usuario_id, compra_id, status_entrega, status_pagamento) 
       VALUES (?, ?, ?, ?)`,
      [req.user.usuarioId, compra_id, status_entrega, status_pagamento]
    );

    res.status(201).json({
      message: "Pedido criado com sucesso!",
      pedido_id: result.insertId,
    });
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Listar pedidos do usuário logado
app.get("/pedidos", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.* 
       FROM pedidos p
       JOIN compras c ON p.compra_id = c.compra_id
       WHERE p.usuario_id = ?`,
      [req.user.usuarioId]
    );

    res.status(200).json(rows);
  } catch (err) {
    console.error("Erro ao listar pedidos:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Buscar detalhes de um pedido específico
app.get("/pedidos/:id", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, c.* 
       FROM pedidos p
       JOIN compras c ON p.compra_id = c.compra_id
       WHERE p.pedido_id = ? AND p.usuario_id = ?`,
      [req.params.id, req.user.usuarioId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Erro ao buscar pedido:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Atualizar status do pedido (ex.: admin ou confirmação de pagamento)
app.put("/pedidos/:id", authenticateToken, async (req, res) => {
  try {
    const { status_entrega, status_pagamento } = req.body;

    if (!status_entrega && !status_pagamento) {
      return res
        .status(400)
        .json({ error: "Informe pelo menos um status para atualizar." });
    }

    const campos = [];
    const params = [];

    if (status_entrega) {
      campos.push("status_entrega = ?");
      params.push(status_entrega);
    }
    if (status_pagamento) {
      campos.push("status_pagamento = ?");
      params.push(status_pagamento);
    }

    params.push(req.params.id, req.user.usuarioId);

    const [result] = await pool.query(
      `UPDATE pedidos SET ${campos.join(", ")} 
       WHERE pedido_id = ? AND usuario_id = ?`,
      params
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Pedido não encontrado ou sem permissão." });
    }

    res.status(200).json({ message: "Pedido atualizado com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar pedido:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Cancelar pedido (protegida)
app.delete("/pedidos/:id", authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE pedidos 
       SET status_entrega = 'Cancelado' 
       WHERE pedido_id = ? AND usuario_id = ?`,
      [req.params.id, req.user.usuarioId]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ error: "Pedido não encontrado ou já cancelado." });
    }

    res.status(200).json({ message: "Pedido cancelado com sucesso!" });
  } catch (err) {
    console.error("Erro ao cancelar pedido:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Criar pagamento para o pedido
app.post("/pagamentos", authenticateToken, async (req, res) => {
  try {
    const { pedido_id, metodo, valor } = req.body;

    if (!pedido_id || !metodo || !valor) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios." });
    }

    // Verifica se o pedido pertence ao usuário
    const [pedido] = await pool.query(
      "SELECT * FROM pedidos WHERE pedido_id = ? AND usuario_id = ?",
      [pedido_id, req.user.usuarioId]
    );

    if (pedido.length === 0) {
      return res
        .status(404)
        .json({ error: "Pedido não encontrado ou sem permissão." });
    }

    const [result] = await pool.query(
      `INSERT INTO pagamentos (pedido_id, metodo, valor, status) 
       VALUES (?, ?, ?, 'Pendente')`,
      [pedido_id, metodo, valor]
    );

    res.status(201).json({
      message: "Pagamento criado com sucesso!",
      pagamento_id: result.insertId,
    });
  } catch (err) {
    console.error("Erro ao criar pagamento:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Consultar pagamento
app.get("/pagamentos/:id", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pg.*, p.usuario_id 
       FROM pagamentos pg
       JOIN pedidos p ON pg.pedido_id = p.pedido_id
       WHERE pg.pagamento_id = ? AND p.usuario_id = ?`,
      [req.params.id, req.user.usuarioId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Pagamento não encontrado." });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Erro ao consultar pagamento:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Atualizar status do pagamento e refletir no pedido
app.put("/pagamentos/:id", authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Informe o novo status." });
    }

    // Atualiza o pagamento
    const [pagamento] = await pool.query(
      `SELECT * FROM pagamentos WHERE pagamento_id = ?`,
      [req.params.id]
    );

    if (pagamento.length === 0) {
      return res.status(404).json({ error: "Pagamento não encontrado." });
    }

    await pool.query(
      `UPDATE pagamentos SET status = ? WHERE pagamento_id = ?`,
      [status, req.params.id]
    );

    // Atualiza o status_pagamento do pedido
    let statusPedido;
    if (status.toLowerCase() === "aprovado") {
      statusPedido = "Pago";
    } else if (
      status.toLowerCase() === "recusado" ||
      status.toLowerCase() === "cancelado"
    ) {
      statusPedido = "Pagamento Cancelado";
    } else {
      statusPedido = "Pendente";
    }

    await pool.query(
      `UPDATE pedidos SET status_pagamento = ? WHERE pedido_id = ?`,
      [statusPedido, pagamento[0].pedido_id]
    );

    res.status(200).json({
      message: "Status do pagamento e do pedido atualizados com sucesso!",
    });
  } catch (err) {
    console.error("Erro ao atualizar pagamento:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Inicializa o servidor
app.listen(PORT, IP_ADDRESS, () => {
  console.log(`Servidor está rodando no IP ${IP_ADDRESS} e porta ${PORT}`);
});
