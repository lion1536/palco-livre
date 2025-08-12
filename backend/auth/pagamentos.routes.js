import { Router } from "express";
import { authenticateToken } from "./auth.middleware.js";
import {
  criarPagamento,
  consultarPagamento,
  atualizarPagamento,
} from "./pagamentos.controller.js";

const router = Router();

// Todas as rotas protegidas
router.post("/", authenticateToken, criarPagamento);
router.get("/:id", authenticateToken, consultarPagamento);
router.put("/:id", authenticateToken, atualizarPagamento);

export default router;
