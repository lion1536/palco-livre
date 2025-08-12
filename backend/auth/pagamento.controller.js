import pool from "./database.js";

export async function criarPagamento(req, res) {
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
}

export async function consultarPagamento(req, res) {
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
}

export async function atualizarPagamento(req, res) {
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
}
