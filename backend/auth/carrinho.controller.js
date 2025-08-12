import pool from "./database.js";

export async function adicionarItem(req, res) {
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
}

export async function removerItem(req, res) {
  try {
    const { itemId } = req.params;
    const id = parseInt(itemId, 10);

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: "ID do item inválido." });
    }

    const [rows] = await pool.query(
      "SELECT * FROM carrinho WHERE carrinho_id = ? AND usuario_id = ?",
      [id, req.user.usuarioId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Item não encontrado no seu carrinho." });
    }

    const [result] = await pool.query(
      "DELETE FROM carrinho WHERE carrinho_id = ? AND usuario_id = ?",
      [id, req.user.usuarioId]
    );

    res.status(200).json({ message: "Item removido do carrinho com sucesso!" });
  } catch (err) {
    console.error("Erro ao remover item do carrinho:", err);
    res.status(500).json({ error: "Erro interno no servidor." });
  }
}

export async function listarItens(req, res) {
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
}
