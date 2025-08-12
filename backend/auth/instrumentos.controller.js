import pool from "./database.js";

export async function listarInstrumentos(req, res) {
  try {
    const [rows] = await pool.query("SELECT * FROM instrumentos");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Erro ao buscar instrumentos:", error);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
}

export async function buscarInstrumentoPorId(req, res) {
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
}

export async function adicionarInstrumento(req, res) {
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
}

export async function atualizarInstrumento(req, res) {
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
}

export async function removerInstrumento(req, res) {
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
}
