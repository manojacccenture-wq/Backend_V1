
import { asyncHandler } from "../../../../../shared/utils/asyncHandler/asyncHandler.js";
import { assignPlanToTenant, getTenantSubscription } from "../../services/subscription.service.js";
import { syncTenantUsage } from "../../services/usage.service.js";

export const assignSubscriptionController = asyncHandler(async (req, res) => {
  const { tenantId, planId, isTrial, trialDays } = req.body;
  
  if (!tenantId || !planId) {
    throw new Error("tenantId and planId are required");
  }

  const assignedBy = req.user.userId;

  const subscription = await assignPlanToTenant({
    tenantId,
    planId,
    assignedBy,
    isTrial,
    trialDays
  });

  res.status(200).json({
    status: "success",
    data: subscription,
  });
});

export const getSubscriptionController = asyncHandler(async (req, res) => {
  // If tenantId is in params (Super Admin), use that. Otherwise use context tenantId (Tenant Admin)
  const tenantId = req.params.tenantId || req.context?.tenantId;

  if (!tenantId) {
    throw new Error("Tenant ID is required");
  }

  // Ensure usage is synced before returning
  await syncTenantUsage(tenantId);
  const subscription = await getTenantSubscription(tenantId);

  res.status(200).json({
    status: "success",
    data: subscription,
  });
});
