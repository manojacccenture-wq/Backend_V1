import { Router } from "express";
import * as policyController from "../../../modules/iam/controller/policy.controller.js";
import { accessAuthMiddleware } from "../../../modules/auth/middleware/access.middleware.js";

const router = Router();

/**
 * IAM Policy Management Routes
 * These routes allow for the creation and assignment of AWS-style policies.
 */

// Create a new policy (Managed or Inline)
router.post("/policies", accessAuthMiddleware, policyController.createPolicy);

// Attach a policy to a Role
router.post("/policies/attach", accessAuthMiddleware, policyController.attachPolicyToRole);

// Test policy evaluation logic
router.post("/policies/test", accessAuthMiddleware, policyController.evaluateTest);

export default router;
