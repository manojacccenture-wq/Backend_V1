import { getMembershipModel } from "../../membership/models/membership.model.js";
import { getTenantSubscriptionModel } from "../models/tenantSubscription.model.js";
import { getTenantProductModel } from "../../tenantProduct/models/tenantProduct.model.js";

export const calculateCurrentUsage = async (tenantId) => {
  const Membership = getMembershipModel();
  const TenantProduct = getTenantProductModel();
  
  // Active users count
  const currentUsers = await Membership.countDocuments({
    tenantId,
    isActive: true,
  });

  // Current products (active products enabled for the tenant)
  const currentProducts = await TenantProduct.countDocuments({
    tenantId,
    isEnabled: true,
  });
  
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
