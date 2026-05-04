import { Router } from "express";
import * as roleController from "../../../modules/global/roles/controller/v1/role.controller.js";
import { accessAuthMiddleware } from "../../../modules/auth/middleware/access.middleware.js";
import { contextMiddleware } from "../../../modules/auth/middleware/context.middleware.js";
import { authorizePolicy } from "../../../modules/iam/middleware/policy.middleware.js";
import {
  authorizeRoleLevel,
  authorizeRoleLevelForDelete,
} from "../../../modules/roles/middleware/roleHierarchy.middleware.js";

const router = Router();

/**
 * Role Management Routes — 3-Layer Security
 *
 * Every request passes through:
 *  1. accessAuthMiddleware  → valid JWT required
 *  2. contextMiddleware     → resolves tenant + IAM permissions into req.context
 *  3. authorizePolicy(...)  → Phase 1: checks IAM policy allows this action
 *  4. authorizeRoleLevel    → Phase 2: checks caller is senior enough in hierarchy
 *  5. controller            → Phase 3: auto-attaches template policy on create
 */

// GET /v1/api/roles — list roles for this tenant
router.get("/",accessAuthMiddleware,contextMiddleware,authorizePolicy("roles:read"),roleController.getRoles);

// POST /v1/api/roles — create a new tenant role
router.post(
  "/",accessAuthMiddleware,contextMiddleware,
  authorizePolicy("roles:create"),  // Phase 1: Must have IAM permission
  authorizeRoleLevel,               // Phase 2: Must be senior enough in hierarchy
  roleController.createRole         // Phase 3: auto-attaches template inside
);

// DELETE /v1/api/roles/:id — delete a tenant role
router.delete(
  "/:id",
  accessAuthMiddleware,
  contextMiddleware,
  authorizePolicy("roles:delete"),        // Phase 1: Must have IAM permission
  authorizeRoleLevelForDelete,            // Phase 2: Cannot delete equal/superior roles
  roleController.deleteRole
);

export default router;

