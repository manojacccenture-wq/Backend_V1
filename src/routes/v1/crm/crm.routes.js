import express from "express";
import { getCustomers } from "../../../modules/crm/controller/crm.controller.js";

import { tenantMiddleware } from "../../../middleware/tenant/tenant.middleware.js";
import { accessAuthMiddleware } from "../../../modules/auth/middleware/access.middleware.js";
import { checkPermission } from "../../../shared/middleware/permission/permission.middleware.js";
import { getDBConnection } from "../../../shared/utils/dbSwitcher/dbSwitcher.js";
import mongoose from "mongoose";

const router = express.Router();

router.get("/customers",/* authMiddleware, */tenantMiddleware, getCustomers);

router.get(
  "/test",
  accessAuthMiddleware,
  tenantMiddleware,
  async (req, res) => {
    res.json({
      msg: "Tenant resolved",
      tenant: req.tenant
    });
  }
);

router.get(
  "/test-db",
  accessAuthMiddleware,
  tenantMiddleware,
  async (req, res) => {

    const db = await getDBConnection(req.tenant);

    res.json({
      msg: "DB switched",
      dbName: db.name
    });
  }
);


router.post(
  "/create",
  accessAuthMiddleware,
  tenantMiddleware,
  async (req, res) => {
    const db = await getDBConnection(req.tenant);

    const TestSchema = new mongoose.Schema({
      name: String,
    });

    const TestModel =
      db.models.Test || db.model("Test", TestSchema);

    const data = await TestModel.create({
      name: req.body.name,
    });

    res.json({
      msg: "Created",
      data,
      db: db.name,
    });
  }
);


export default router;