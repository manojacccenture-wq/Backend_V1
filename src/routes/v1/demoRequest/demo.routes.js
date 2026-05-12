import express from "express";
import * as demoController from "../../../modules/demoRequest/controller_v1/demo.controller.js";
import { authorize } from "../../../shared/middleware/authorizeMiddleware/authorize.middleware.js";
import { accessAuthMiddleware } from "../../../modules/auth/middleware/access.middleware.js";

const router = express.Router();

// User requested to use "isSuperAdmin" middleware.
// Authorize middleware supports super admin check automatically when we pass empty or specific scopes.
// Or we can define a quick inline middleware since `isSuperAdmin` wasn't exported globally.


// ================================
// DEMO REQUEST
// ================================
router.post("/demo-request", demoController.handleDemoRequest);
router.get("/", accessAuthMiddleware, demoController.getDemoRequests);
router.post("/:id/approve", accessAuthMiddleware, demoController.approveDemoRequest);
router.post("/:id/reject", accessAuthMiddleware, demoController.rejectDemoRequest);

export default router;