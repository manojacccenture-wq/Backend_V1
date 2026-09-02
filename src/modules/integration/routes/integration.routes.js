import express from "express";
import { getFoodErpRoles } from "../controller/v1/integration.controller.js";
import { accessAuthMiddleware } from "../../auth/middleware/access.middleware.js";

const router = express.Router();

router.get("/fooderp/roles", accessAuthMiddleware, getFoodErpRoles);

export default router;
