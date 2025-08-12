import pool from "./database.js";

export async function criarPedido(req, res) {
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
}

export async function listarPedidos(req, res) {
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
}

export async function buscarPedidoPorId(req, res) {
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
}

export async function atualizarPedido(req, res) {
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
}

export async function cancelarPedido(req, res) {
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
}
