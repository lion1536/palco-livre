import { Router } from "express";
import { authenticateToken } from "./auth.middleware.js";
import {
  criarPedido,
  listarPedidos,
  buscarPedido,
  atualizarPedido,
  cancelarPedido,
} from "./pedidos.controller.js";

const router = Router();

// Todas as rotas protegidas
router.post("/", authenticateToken, criarPedido);
router.get("/", authenticateToken, listarPedidos);
router.get("/:id", authenticateToken, buscarPedido);
router.put("/:id", authenticateToken, atualizarPedido);
router.delete("/:id", authenticateToken, cancelarPedido);

export default router;
