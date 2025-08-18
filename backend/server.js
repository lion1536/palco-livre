import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import multer from "multer";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Regex para validar email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Regex para validar nome de arquivo e extensões de imagem
const imageRegex = /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|gif|webp)$/i;

// Garante que a pasta de uploads existe
const uploadDir = "uploads/perfis";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname).toLowerCase());
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const validMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  if (!imageRegex.test(file.originalname)) {
    return cb(new Error("Nome de arquivo inválido ou extensão não permitida."));
  }

  if (!validMimes.includes(file.mimetype)) {
    return cb(new Error("Formato de arquivo inválido."));
  }

  cb(null, true);
};

const upload = multer({ storage, fileFilter });

// Middleware para servir arquivos estáticos (imagens)
app.use("/uploads", express.static("uploads"));

// Middleware para aceitar JSON
app.use(express.json());

// CORS para DEV (aceita qualquer origem sem crash)
app.use(
  cors({
    origin: (origin, callback) => callback(null, true), // aceita qualquer origem, inclusive file://
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// Pool de conexão MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
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
    const [rows] = await pool.query("SELECT * FROM sessions WHERE token = ?", [
      token,
    ]);
    if (rows.length === 0)
      return res.status(403).json({ error: "Sessão inválida ou expirada" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { usuarioId: payload.usuarioId };
    next();
  } catch (err) {
    console.error("Erro na autenticação:", err);
    return res.status(403).json({ error: "Token inválido ou expirado" });
  }
}

// Rota cadastro
app.post("/cadastro", async (req, res) => {
  try {
    const { email, senha, endereco } = req.body;

    if (!email || !senha)
      return res.status(400).json({ error: "Preencha email e senha." });
    if (!emailRegex.test(email))
      return res.status(400).json({ error: "Email inválido." });

    const [existing] = await pool.query("SELECT * FROM login WHERE email = ?", [
      email,
    ]);
    if (existing.length > 0)
      return res.status(409).json({ error: "Email já cadastrado." });

    const senhaHash = await bcrypt.hash(senha, 10);
    const dataAtual = new Date();

    if (endereco) {
      await pool.query(
        "INSERT INTO login (email, senha_hash, data_criacao, data_att, endereco) VALUES (?, ?, ?, ?, ?)",
        [email, senhaHash, dataAtual, dataAtual, endereco]
      );
    } else {
      await pool.query(
        "INSERT INTO login (email, senha_hash, data_criacao, data_att) VALUES (?, ?, ?, ?)",
        [email, senhaHash, dataAtual, dataAtual]
      );
    }

    res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
  } catch (err) {
    console.error("Erro no cadastro:", err);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});

// Rota login (gera token)
app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha)
      return res.status(400).json({ error: "Campos obrigatórios" });

    const [rows] = await pool.query("SELECT * FROM login WHERE email = ?", [
      email,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Usuário não encontrado" });

    const usuario = rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) return res.status(401).json({ error: "Senha incorreta" });

    const token = jwt.sign(
      { usuarioId: usuario.usuario_id, email: usuario.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Salvar token na tabela sessions
    await pool.query("INSERT INTO sessions (usuario_id, token) VALUES (?, ?)", [
      usuario.usuario_id,
      token,
    ]);

    res.json({
      usuario: { id: usuario.usuario_id, email: usuario.email },
      token,
    });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Remover item do carrinho
app.delete("/carrinho/:itemId", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.itemId, 10);
    if (isNaN(id) || id <= 0)
      return res.status(400).json({ error: "ID inválido." });

    const [rows] = await pool.query(
      "SELECT * FROM carrinho WHERE carrinho_id = ? AND usuario_id = ?",
      [id, req.user.usuarioId]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Item não encontrado." });

    await pool.query(
      "DELETE FROM carrinho WHERE carrinho_id = ? AND usuario_id = ?",
      [id, req.user.usuarioId]
    );
    res.json({ message: "Item removido do carrinho com sucesso!" });
  } catch (err) {
    console.error("Erro ao remover item:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Listar itens do carrinho
app.get("/carrinho", authenticateToken, async (req, res) => {
  try {
    const [items] = await pool.query(
      `
      SELECT c.carrinho_id, c.quantidade, i.nome, i.preco, img.caminho AS imagem_principal
      FROM carrinho c
      JOIN instrumentos i ON c.instrumento_id = i.instrumento_id
      LEFT JOIN instrumento_imagens img
        ON i.instrumento_id = img.instrumento_id AND img.principal = TRUE
      WHERE c.usuario_id = ?
    `,
      [req.user.usuarioId]
    );

    res.json({ carrinho: items });
  } catch (err) {
    console.error("Erro ao listar itens do carrinho:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Adicionar item ao carrinho
app.post("/carrinho", authenticateToken, async (req, res) => {
  try {
    const { instrumentoId, quantidade } = req.body;
    if (!instrumentoId || !quantidade)
      return res
        .status(400)
        .json({ error: "Instrumento e quantidade são obrigatórios." });

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

// Rota GET /buscar
app.get("/buscar", async (req, res) => {
  try {
    const { nome, categoria, marca } = req.query;
    let filtros = [];
    let params = [];

    if (nome) {
      filtros.push("i.nome COLLATE utf8mb4_general_ci LIKE ?");
      params.push(`%${nome}%`);
    }
    if (categoria) {
      filtros.push("i.categoria COLLATE utf8mb4_general_ci = ?");
      params.push(categoria);
    }
    if (marca) {
      filtros.push("i.marca COLLATE utf8mb4_general_ci = ?");
      params.push(marca);
    }

    const whereClause =
      filtros.length > 0 ? "WHERE " + filtros.join(" AND ") : "";

    const [rows] = await pool.query(
      `
      SELECT i.*, im.caminho AS imagem
      FROM instrumentos i
      LEFT JOIN instrumento_imagens im
        ON i.instrumento_id = im.instrumento_id AND im.principal = TRUE
      ${whereClause}
    `,
      params
    );

    res.json({ resultados: rows });
  } catch (err) {
    console.error("Erro na busca:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Rota POST /buscar
app.post("/buscar", async (req, res) => {
  try {
    const { nome, categoria, marca, preco_min, preco_max } = req.body;
    let filtros = [];
    let params = [];

    if (nome) {
      filtros.push("i.nome COLLATE utf8mb4_general_ci LIKE ?");
      params.push(`%${nome}%`);
    }
    if (categoria) {
      filtros.push("i.categoria COLLATE utf8mb4_general_ci = ?");
      params.push(categoria);
    }
    if (marca) {
      filtros.push("i.marca COLLATE utf8mb4_general_ci = ?");
      params.push(marca);
    }

    if (preco_min != null) {
      filtros.push("i.preco >= ?");
      params.push(Number(preco_min));
    }
    if (preco_max != null) {
      filtros.push("i.preco <= ?");
      params.push(Number(preco_max));
    }

    const whereClause =
      filtros.length > 0 ? "WHERE " + filtros.join(" AND ") : "";

    const [rows] = await pool.query(
      `
      SELECT i.*, im.caminho AS imagem
      FROM instrumentos i
      LEFT JOIN instrumento_imagens im
        ON i.instrumento_id = im.instrumento_id AND im.principal = TRUE
      ${whereClause}
    `,
      params
    );

    res.json({ resultados: rows });
  } catch (err) {
    console.error("Erro na busca POST:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Listar todos os instrumentos
app.get("/instrumentos", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*, im.caminho AS imagem_principal
      FROM instrumentos i
      LEFT JOIN instrumento_imagens im
        ON i.instrumento_id = im.instrumento_id AND im.principal = TRUE
    `);
    res.json(rows);
  } catch (err) {
    console.error("Erro ao listar instrumentos:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Buscar instrumento por ID
app.get("/instrumentos/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT i.*, ii.caminho AS imagem_principal
      FROM instrumentos i
      LEFT JOIN instrumento_imagens ii
        ON i.instrumento_id = ii.instrumento_id AND ii.principal = TRUE
      WHERE i.instrumento_id = ?
    `,
      [req.params.id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Instrumento não encontrado." });

    res.json(rows[0]);
  } catch (err) {
    console.error("Erro ao buscar instrumento:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Adicionar novo instrumento + imagem (protegida)
app.post("/instrumentos", authenticateToken, async (req, res) => {
  try {
    const { nome, categoria, marca, descricao, preco, estoque } = req.body;
    if (!nome || !categoria || !marca || !preco || estoque == null)
      return res
        .status(400)
        .json({ error: "Preencha todos os campos obrigatórios." });

    const [result] = await pool.query(
      "INSERT INTO instrumentos (nome, categoria, marca, descricao, preco, estoque) VALUES (?, ?, ?, ?, ?, ?)",
      [nome, categoria, marca, descricao || null, preco, estoque]
    );

    res.status(201).json({
      message: "Instrumento adicionado com sucesso!",
      id: result.insertId,
    });
  } catch (err) {
    console.error("Erro ao adicionar instrumento:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
});

// Atualizar instrumento + imagem (protegida)
app.put("/instrumentos/:id", authenticateToken, async (req, res) => {
  try {
    const { nome, categoria, marca, descricao, preco, estoque } = req.body;
    const [result] = await pool.query(
      "UPDATE instrumentos SET nome=?, categoria=?, marca=?, descricao=?, preco=?, estoque=? WHERE instrumento_id=?",
      [nome, categoria, marca, descricao, preco, estoque, req.params.id]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Instrumento não encontrado." });

    res.json({ message: "Instrumento atualizado com sucesso!" });
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

    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Instrumento não encontrado." });

    res.json({ message: "Instrumento removido com sucesso!" });
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

// Upload de foto de perfil
app.post(
  "/upload-foto",
  authenticateToken,
  upload.single("foto"),
  async (req, res) => {
    try {
      const usuarioId = req.user.usuarioId;
      if (!req.file) {
        return res.status(400).json({ error: "Nenhuma foto enviada." });
      }

      const caminhoFoto = `/uploads/perfis/${req.file.filename}`;

      // Marca qualquer outra como não principal
      await pool.query(
        "UPDATE usuario_fotos SET principal = FALSE WHERE usuario_id = ?",
        [usuarioId]
      );

      // Insere a nova foto
      await pool.query(
        "INSERT INTO usuario_fotos (usuario_id, caminho, principal) VALUES (?, ?, TRUE)",
        [usuarioId, caminhoFoto]
      );

      res.json({ success: true, foto: caminhoFoto });
    } catch (error) {
      console.error("Erro no upload de foto:", error);
      res.status(500).json({ error: "Erro ao salvar foto." });
    }
  }
);

app.get("/foto-perfil", authenticateToken, async (req, res) => {
  try {
    const usuarioId = req.user.usuarioId;
    const [rows] = await pool.query(
      "SELECT caminho FROM usuario_fotos WHERE usuario_id = ? AND principal = TRUE LIMIT 1",
      [usuarioId]
    );

    if (rows.length === 0) {
      return res.json({ foto: null });
    }

    res.json({ foto: rows[0].caminho });
  } catch (err) {
    console.error("Erro ao buscar foto:", err);
    res.status(500).json({ error: "Erro interno." });
  }
});

// rota para buscar dados do usuário logado
app.get("/me", authenticateToken, async (req, res) => {
  try {
    const usuarioId = req.user.usuarioId;

    const [rows] = await pool.query(
      "SELECT email, endereco FROM login WHERE usuario_id = ?",
      [usuarioId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({
      email: rows[0].email,
      endereco: rows[0].endereco,
      nome: rows[0].email.split("@")[0], // gera um "nome" simples a partir do email
    });
  } catch (err) {
    console.error("Erro /me:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
