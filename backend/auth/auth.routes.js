import { Router } from "express";
import { loginUser } from "./auth.controller.js";

const router = Router();

router.post("/login", loginUser);

export default router;
