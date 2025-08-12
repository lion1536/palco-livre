import { Router } from "express";
import { authenticateToken } from "./auth.middleware.js";
import {
  listarInstrumentos,
  buscarInstrumentoPorId,
  adicionarInstrumento,
  atualizarInstrumento,
  removerInstrumento,
} from "./instrumentos.controller.js";

const router = Router();

// Rotas públicas
router.get("/", listarInstrumentos);
router.get("/:id", buscarInstrumentoPorId);

// Rotas protegidas
router.post("/", authenticateToken, adicionarInstrumento);
router.put("/:id", authenticateToken, atualizarInstrumento);
router.delete("/:id", authenticateToken, removerInstrumento);

export default router;
