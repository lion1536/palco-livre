import { Router } from "express";
import { authenticateToken } from "./auth.middleware.js";
import {
  adicionarItem,
  removerItem,
  listarItens,
} from "../controllers/carrinho.controller.js";

const router = Router();

router.post("/", authenticateToken, adicionarItem);
router.delete("/:itemId", authenticateToken, removerItem);
router.get("/", authenticateToken, listarItens);

export default router;
