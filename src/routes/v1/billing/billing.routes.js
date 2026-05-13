import express from "express";
import { accessAuthMiddleware } from "../../../modules/auth/middleware/access.middleware.js";
import { contextMiddleware } from "../../../modules/auth/middleware/context.middleware.js";
import { 
  createPlanController, 
  updatePlanController, 
  deactivatePlanController, 
  getPlansController, 
  getPlanByIdController 
} from "../../../modules/global/plans/controller/v1/plan.controller.js";
import { 
  assignSubscriptionController, 
  getSubscriptionController 
} from "../../../modules/global/plans/controller/v1/subscription.controller.js";
import { asyncHandler } from "../../../shared/utils/asyncHandler/asyncHandler.js";
import { getSuperAdminDashboardStats } from "../../../modules/global/plans/services/dashboardStats.service.js";

const getDashboardStatsController = asyncHandler(async (req, res) => {
  const stats = await getSuperAdminDashboardStats();
  res.json({ status: "success", data: stats });
});

const router = express.Router();

// ==========================================
// SUPER ADMIN ROUTES (No Tenant Context)
// ==========================================
// TODO: Add proper SuperAdmin role guard middleware here if available. 
// For now relying on accessAuthMiddleware and assuming frontend protects it or further role checks.

// Plans CRUD
router.post("/plans", accessAuthMiddleware, createPlanController);
router.get("/plans", accessAuthMiddleware, getPlansController);
router.get("/plans/:id", accessAuthMiddleware, getPlanByIdController);
router.put("/plans/:id", accessAuthMiddleware, updatePlanController);
router.delete("/plans/:id", accessAuthMiddleware, deactivatePlanController);

// Subscriptions management (Super Admin)
router.post("/subscriptions/assign", accessAuthMiddleware, assignSubscriptionController);
router.get("/subscriptions/tenant/:tenantId", accessAuthMiddleware, getSubscriptionController);

// Super Admin dashboard aggregation stats
router.get("/admin/stats", accessAuthMiddleware, getDashboardStatsController);

// ==========================================
// TENANT ADMIN ROUTES (Requires Tenant Context)
// ==========================================
router.get("/subscriptions/me", accessAuthMiddleware, contextMiddleware, getSubscriptionController);

export default router;
