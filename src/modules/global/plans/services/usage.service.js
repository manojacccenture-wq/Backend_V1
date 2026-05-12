import { getMembershipModel } from "../../membership/models/membership.model.js";
import { getTenantSubscriptionModel } from "../models/tenantSubscription.model.js";

export const calculateCurrentUsage = async (tenantId) => {
  const Membership = getMembershipModel();
  
  // Active users count
  const currentUsers = await Membership.countDocuments({
    tenantId,
    isActive: true,
  });

  // Current products (distinct products for tenant)
  const productsResult = await Membership.distinct("productId", {
    tenantId,
    isActive: true,
    productId: { $ne: null }
  });
  
  const currentProducts = productsResult.length;

  return { currentUsers, currentProducts };
};

export const syncTenantUsage = async (tenantId) => {
  const { currentUsers, currentProducts } = await calculateCurrentUsage(tenantId);
  const TenantSubscription = getTenantSubscriptionModel();
  
  await TenantSubscription.findOneAndUpdate(
    { tenantId },
    {
      $set: {
        "usageSnapshot.currentUsers": currentUsers,
        "usageSnapshot.currentProducts": currentProducts,
      }
    }
  );

  return { currentUsers, currentProducts };
};
