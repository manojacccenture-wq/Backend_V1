import { getTenantModel } from "../../../global/tenant/models/tenant.model.js";
import { getDemoRequestModel } from "../../../demoRequest/models/demoRequest.model.js";
import { getPlanModel } from "../models/plans.model.js";
import { getTenantSubscriptionModel } from "../models/tenantSubscription.model.js";

/**
 * getSuperAdminDashboardStats
 * 
 * Single aggregation for the Super Admin dashboard.
 * Runs all four queries in parallel via Promise.all — no sequential blocking.
 * Reuses existing model factories — no duplicated business logic.
 */
export const getSuperAdminDashboardStats = async () => {
  const Tenant = getTenantModel();
  const DemoRequest = getDemoRequestModel();
  const Plan = getPlanModel();
  const TenantSubscription = getTenantSubscriptionModel();

  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();

  const [
    totalTenants,
    activeTenants,
    pendingDemoRequests,
    activePlans,
    recentTenants,
    recentDemoRequests,
    expiringTrialSubscriptions,
  ] = await Promise.all([
    Tenant.countDocuments(),
    Tenant.countDocuments({ isActive: true }),
    DemoRequest.countDocuments({ status: "pending" }),
    Plan.countDocuments({ isActive: true }),

    // Last 5 tenants — for Recent Tenants widget
    Tenant.find()
      .sort({ _id: -1 })
      .limit(5)
      .select("name dataMode isActive createdAt")
      .lean(),

    // Last 5 demo requests — for Recent Demo Requests widget
    DemoRequest.find()
      .sort({ _id: -1 })
      .limit(5)
      .select("companyName workEmail status createdAt")
      .lean(),

    // Subscriptions expiring within 7 days — for Trial Expiry Watch widget
    TenantSubscription.find({
      status: "trial",
      trialEndsAt: { $gte: now, $lte: sevenDaysFromNow },
    })
      .populate("tenantId", "name")
      .populate("planId", "name")
      .select("tenantId planId trialEndsAt")
      .lean(),
  ]);

  // Shape the expiring trials for frontend consumption
  const expiringTrials = expiringTrialSubscriptions.map((sub) => ({
    tenantId: sub.tenantId?._id,
    tenantName: sub.tenantId?.name || "Unknown",
    planName: sub.planId?.name || "Unknown",
    trialEndsAt: sub.trialEndsAt,
    daysLeft: Math.ceil((new Date(sub.trialEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  }));

  return {
    totalTenants,
    activeTenants,
    pendingDemoRequests,
    activePlans,
    recentTenants,
    recentDemoRequests,
    expiringTrials,
  };
};
