import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();

const PORT = 3000;

const allowedOrigins = ["http://localhost:3000"];

// Configuração do cors
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new Error("CORS não permitido"), false);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "DELETE"],
  })
);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE"],
  })
);

app.use(express.json());

// Pool MySQL
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

// Middleware autenticação JWT + valida sessão no banco
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

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: "Token inválido" });
      req.user = user;
      next();
    });
  } catch (err) {
    console.error("Erro na autenticação:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
}

// Rota de teste
app.get("/", (req, res) => {
  res.send("Servidor funcionando!");
});

// Inicialização do servidor
app.listen(process.env.PORT || 3000, () => {
  console.log(`Servidor rodando na porta: ${PORT}`);
});
