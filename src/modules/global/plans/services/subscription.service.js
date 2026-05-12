import { getTenantSubscriptionModel } from "../models/tenantSubscription.model.js";
import { getPlanModel } from "../models/plans.model.js";
import { ensureDefaultTrialPlan } from "./plan.service.js";

export const assignPlanToTenant = async ({ tenantId, planId, assignedBy = null, isTrial = false, trialDays = 14 }, session = null) => {
  const TenantSubscription = getTenantSubscriptionModel();
  const Plan = getPlanModel();

  const plan = await Plan.findById(planId).session(session);
  if (!plan) throw new Error("Plan not found");

  const now = new Date();
  let trialEndsAt = null;
  let status = "active";

  if (isTrial || plan.isTrialPlan) {
    trialEndsAt = new Date(now.getTime() + (trialDays || plan.trialDays) * 24 * 60 * 60 * 1000);
    status = "trial";
  }

  // Upsert subscription
  const subscription = await TenantSubscription.findOneAndUpdate(
    { tenantId },
    {
      planId,
      status,
      startDate: now,
      trialEndsAt,
      assignedBy,
    },
    { new: true, upsert: true, session }
  );

  return subscription;
};

export const initializeTenantBilling = async (tenantId, session = null) => {
  const defaultPlan = await ensureDefaultTrialPlan();
  return await assignPlanToTenant({
    tenantId,
    planId: defaultPlan._id,
    isTrial: true,
    trialDays: defaultPlan.trialDays
  }, session);
};

export const getTenantSubscription = async (tenantId) => {
  const TenantSubscription = getTenantSubscriptionModel();
  const subscription = await TenantSubscription.findOne({ tenantId })
    .populate("planId")
    .lean();
  return subscription;
};

export const updateUsageSnapshot = async (tenantId, currentUsers, currentProducts) => {
  const TenantSubscription = getTenantSubscriptionModel();
  return await TenantSubscription.findOneAndUpdate(
    { tenantId },
    {
      $set: {
        "usageSnapshot.currentUsers": currentUsers,
        "usageSnapshot.currentProducts": currentProducts,
      }
    },
    { new: true }
  );
};

export const validateSubscriptionLimits = async (tenantId) => {
  const subscription = await getTenantSubscription(tenantId);
  if (!subscription) return { allowed: false, reason: "No active subscription found" };

  if (subscription.status === "expired" || subscription.status === "cancelled") {
    return { allowed: false, reason: `Subscription is ${subscription.status}` };
  }

  const plan = subscription.planId;
  const { currentUsers, currentProducts } = subscription.usageSnapshot;

  if (plan.maxUsers > 0 && currentUsers >= plan.maxUsers) {
    return { allowed: false, reason: "User limit reached for current plan" };
  }

  if (plan.maxProducts > 0 && currentProducts >= plan.maxProducts) {
    return { allowed: false, reason: "Product limit reached for current plan" };
  }

  return { allowed: true };
};
