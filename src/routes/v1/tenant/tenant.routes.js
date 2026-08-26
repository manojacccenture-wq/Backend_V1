import express from "express";
import { createTenantController, getTenantsController, getTenantUsersController, deleteTenantController } from "../../../modules/global/tenant/controller/v1/tenant.controller.js";
import { createUser } from "../../../modules/global/users/controller/v1/user.controller.js";
import { accessAuthMiddleware } from "../../../modules/auth/middleware/access.middleware.js";
import { contextMiddleware } from "../../../modules/auth/middleware/context.middleware.js";

const router = express.Router();

// Tenant & User Management
router.post("/create-with-admin", createTenantController);
router.get("/", getTenantsController);

// User Management under Tenant context
router.get("/:tenantId/users", accessAuthMiddleware, contextMiddleware, getTenantUsersController);
router.post("/:tenantId/users", accessAuthMiddleware, contextMiddleware, createUser);

// Delete Tenant (Superadmin only)
router.delete("/:tenantId", accessAuthMiddleware, contextMiddleware, deleteTenantController);



export default router;