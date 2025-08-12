import jwt from "jsonwebtoken";
import pool from "./database.js";

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    // Verifica se token está ativo na tabela sessions
    const [rows] = await pool.query("SELECT * FROM sessions WHERE token = ?", [
      token,
    ]);

    if (rows.length === 0) {
      return res.status(403).json({ error: "Sessão inválida ou expirada" });
    }

    // Verifica JWT
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      req.user = user; // adiciona dados do usuário na requisição
      next();
    } catch (err) {
      return res.status(403).json({ error: "Token inválido" });
    }
  } catch (err) {
    console.error("Erro na autenticação:", err);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
}
