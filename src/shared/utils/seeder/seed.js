import speakeasy from "speakeasy";
import { getTenantModel } from "../../../modules/global/tenant/models/tenant.model.js";
import { getUserModel } from "../../../modules/global/users/models/user.model.js";
import { getProductModel } from "../../../modules/global/products/models/product.model.js";
import { getMembershipModel } from "../../../modules/global/membership/models/membership.model.js";
import { assignProductToUser } from "../../../modules/global/userProduct/services/userProduct.service.js";
import { hashPassword } from "../../services/hashPassword/hash.service.js";
import { seedRBAC } from "./seedRBAC.js";
import { getRoleModel } from "../../../modules/global/roles/models/roles.models.js";


export const seedData = async () => {
  console.log("🌱 Seeding data...");

  await seedRBAC();
  const Tenant = getTenantModel();
  const User = getUserModel();
  const Product = getProductModel();
  const Membership = getMembershipModel();
  const Role = getRoleModel()


  await Tenant.deleteMany();
  await User.deleteMany();
  await Product.deleteMany();
  await Membership.deleteMany();

  // get roles
const superAdminRole = await Role.findOne({ name: "SUPER_ADMIN" });
const tenantAdminRole = await Role.findOne({ name: "TENANT_ADMIN" });

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

  // assign roles

// 🔥 shared user → SUPER_ADMIN
await Membership.create({
  userId: sharedUser._id,
  roleId: superAdminRole._id,
  scope: "platform",
});

// 🔥 enterprise user → TENANT_ADMIN
await Membership.create({
  userId: enterpriseUser._id,
  roleId: tenantAdminRole._id,
  scope: "tenant",
  tenantId: enterpriseTenant._id,
});

  console.log("✅ Seed completed");
};