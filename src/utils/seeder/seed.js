import speakeasy from "speakeasy";
import { getTenantModel } from "../../modules/global/tenant/models/tenant.model.js";
import { getUserModel } from "../../modules/global/users/models/user.model.js";
import { getProductModel } from "../../modules/global/products/models/product.model.js";
import { assignProductToUser } from "../../modules/global/userProduct/services/userProduct.service.js";
import { hashPassword } from "../../shared/services/hashPassword/hash.service.js";
import logger from "../../shared/services/logger/logger.js";

export const seedData = async () => {
  logger.info("🌱 Seeding data...");

  const Tenant = getTenantModel();
  const User = getUserModel();
  const Product = getProductModel();

  await Tenant.deleteMany();
  await User.deleteMany();
  await Product.deleteMany();

  // 🔐 Generate MFA secret for testing
const mfaSecret = speakeasy.generateSecret({
  name: "MyApp (shared@user.com)",
});

  // tenants
  const sharedTenant = await Tenant.create({
    name: "Startup",
    dataMode: "shared",
  });

  const enterpriseTenant = await Tenant.create({
    name: "Enterprise",
    dataMode: "isolated",
    dbName: "tenant_enterprise_db",
  });

  const password = await hashPassword("123456");

  // users
  const sharedUser = await User.create({
    email: "shared@user.com",
    password,
    tenantId: sharedTenant._id,
     // 🔐 MFA enabled user (for testing)
  mfaEnabled: true,
  mfaSecret: mfaSecret.base32,
  });

  const enterpriseUser = await User.create({
    email: "enterprise@user.com",
    password,
    tenantId: enterpriseTenant._id,
  });

  // products
  const sharedCRM = await Product.create({
    name: "CRM",
    tenantId: sharedTenant._id,
  });

  const enterpriseCRM = await Product.create({
    name: "CRM",
    tenantId: enterpriseTenant._id,
  });

  const enterpriseBilling = await Product.create({
    name: "Billing",
    tenantId: enterpriseTenant._id,
  });

  // 🔥 assign (auto sync)
  await assignProductToUser({
    userId: sharedUser._id,
    productId: sharedCRM._id,
    tenantId: sharedTenant._id,
    role: "admin",
  });

  await assignProductToUser({
    userId: enterpriseUser._id,
    productId: enterpriseCRM._id,
    tenantId: enterpriseTenant._id,
  });

  await assignProductToUser({
    userId: enterpriseUser._id,
    productId: enterpriseBilling._id,
    tenantId: enterpriseTenant._id,
  });

  logger.info("✅ Seed completed");
};