import speakeasy from "speakeasy";
import { getTenantModel } from "../../../modules/global/tenant/models/tenant.model.js";
import { getUserModel } from "../../../modules/global/users/models/user.model.js";
import { getProductModel } from "../../../modules/global/products/models/product.model.js";
import { getTenantProductModel } from "../../../modules/global/tenantProduct/models/tenantProduct.model.js";
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
  const TenantProduct = getTenantProductModel();
  const Membership = getMembershipModel();
  const Role = getRoleModel();

  await Promise.all([
    Tenant.deleteMany(),
    User.deleteMany(),
    Product.deleteMany(),
    TenantProduct.deleteMany(),
    Membership.deleteMany(),
  ]);

  // ROLES
const superAdminRole = await Role.findOne({ code: "SUPER_ADMIN" });
const tenantAdminRole = await Role.findOne({ code: "TENANT_ADMIN" });

  // MFA
  const mfaSecret = speakeasy.generateSecret({
    name: "MyApp (shared@user.com)",
  });

  // TENANTS
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

  // USERS
  const superAdminUser = await User.create({
    email: "manojacccenture@gmail.com",
    password,
    mfaEnabled: true,
    mfaSecret: mfaSecret.base32,
  });

  const enterpriseUser = await User.create({
    email: "enterprise@user.com",
    password,
  });

  // =========================
  // 🌍 GLOBAL PRODUCTS
  // =========================

  const crm = await Product.create({
    name: "CRM",
    code: "crm",
  });

  const billing = await Product.create({
    name: "Billing",
    code: "billing",
  });

  // =========================
  // 🏢 TENANT PRODUCT MAPPING
  // =========================

  // Startup → CRM
  await TenantProduct.create({
    tenantId: sharedTenant._id,
    productId: crm._id,
  });

  // Enterprise → CRM + Billing
  await TenantProduct.create({
    tenantId: enterpriseTenant._id,
    productId: crm._id,
  });

  await TenantProduct.create({
    tenantId: enterpriseTenant._id,
    productId: billing._id,
  });

  // =========================
  // 👤 USER PRODUCT ACCESS
  // =========================

  await assignProductToUser({
    userId: enterpriseUser._id,
    tenantId: enterpriseTenant._id,
    productId: crm._id,
  });

  await assignProductToUser({
    userId: enterpriseUser._id,
    tenantId: enterpriseTenant._id,
    productId: billing._id,
  });

  // =========================
  // 🔐 MEMBERSHIP (RBAC)
  // =========================

  // SUPER ADMIN
  await Membership.create({
    userId: superAdminUser._id,
    roleId: superAdminRole._id,
  });

  // TENANT ADMIN
  await Membership.create({
    userId: enterpriseUser._id,
    roleId: tenantAdminRole._id,
    tenantId: enterpriseTenant._id,
  });

  console.log("✅ Seed completed");
};