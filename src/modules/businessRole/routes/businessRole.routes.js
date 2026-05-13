import express from "express";
import {
  listBusinessRoles,
  getOneBusinessRole,
  createBusinessRoleController,
  updateBusinessRoleController,
  deleteBusinessRoleController,
  listCapabilities,
  assignBusinessRole,
} from "../controller/v1/businessRole.controller.js";
import { accessAuthMiddleware } from "../../auth/middleware/access.middleware.js";
import { contextMiddleware } from "../../auth/middleware/context.middleware.js";

const router = express.Router();

// All business-role routes require auth + tenant context
const tenantGuard = [accessAuthMiddleware, contextMiddleware];

// ─── Capability Registry ──────────────────────────────────────────────────────
// MUST be declared BEFORE /:id routes — Express matches top-to-bottom.
// If /:id is first, "capabilities" is captured as an id param and this never runs.
router.get("/capabilities/all", accessAuthMiddleware, listCapabilities);

// ─── Membership business role assignment ──────────────────────────────────────
// Also declared before /:id to avoid param capture
router.put("/memberships/:membershipId/business-role", tenantGuard, assignBusinessRole);

// ─── Business Roles CRUD ──────────────────────────────────────────────────────
router.get("/",        tenantGuard, listBusinessRoles);
router.post("/",       tenantGuard, createBusinessRoleController);
router.get("/:id",     tenantGuard, getOneBusinessRole);
router.put("/:id",     tenantGuard, updateBusinessRoleController);
router.delete("/:id",  tenantGuard, deleteBusinessRoleController);

export default router;
