import express from "express";
import { getCustomers } from "../../../modules/crm/controller/crm.controller.js";
import { authMiddleware } from "../../../middleware/Auth/auth.middleware.js";
import { tenantMiddleware } from "../../../middleware/tenant/tenant.middleware.js";

const router = express.Router();

router.get("/customers",authMiddleware,tenantMiddleware, getCustomers);

export default router;