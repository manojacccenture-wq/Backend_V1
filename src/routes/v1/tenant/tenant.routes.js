import express from "express";
import { createTenantController, getTenantsController,getTenantUsersController } from "../../../modules/global/tenant/controller/v1/tenant.controller.js";

const router = express.Router();

// Creation of Tenant
router.post("/create-with-admin", createTenantController);
router.get("/", getTenantsController);
router.get("/:tenantId/users", getTenantUsersController);



export default router;