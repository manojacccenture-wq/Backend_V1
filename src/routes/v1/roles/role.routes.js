import { Router } from "express";
import * as roleController from "../../../modules/global/roles/controller/v1/role.controller.js";
import { accessAuthMiddleware } from "../../../modules/auth/middleware/access.middleware.js";
import { contextMiddleware } from "../../../modules/auth/middleware/context.middleware.js";

const router = Router();

router.get("/", accessAuthMiddleware, contextMiddleware, roleController.getRoles);
router.post("/", accessAuthMiddleware, contextMiddleware, roleController.createRole);
router.delete("/:id", accessAuthMiddleware, contextMiddleware, roleController.deleteRole);

export default router;
