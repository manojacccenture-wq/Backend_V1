import express from "express";
import { getCustomers } from "../../../modules/crm/controller/crm.controller.js";

import { tenantMiddleware } from "../../../middleware/tenant/tenant.middleware.js";
import { accessAuthMiddleware } from "../../../modules/auth/middleware/access.middleware.js";

const router = express.Router();

router.get("/customers",/* authMiddleware, */tenantMiddleware, getCustomers);

router.get(
  "/test-auth",
  accessAuthMiddleware,
  (req, res) => {
    res.json({ msg: "Access token valid", user: req.user });
  }
);

export default router;