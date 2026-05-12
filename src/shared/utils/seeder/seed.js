import speakeasy from "speakeasy";
import { getTenantModel } from "../../../modules/global/tenant/models/tenant.model.js";
import { getUserModel } from "../../../modules/global/users/models/user.model.js";
import { getProductModel } from "../../../modules/global/products/models/product.model.js";
import { getTenantProductModel } from "../../../modules/global/tenantProduct/models/tenantProduct.model.js";
import { getMembershipModel } from "../../../modules/global/membership/models/membership.model.js";
import { getRoleModel, CATEGORY_LEVEL_MAP } from "../../../modules/global/roles/models/roles.models.js";
import { getPolicyModel } from "../../../modules/iam/models/policy.model.js";
import { getRolePolicyModel } from "../../../modules/iam/models/rolePolicy.model.js";
import { hashPassword } from "../../services/hashPassword/hash.service.js";
import { getPlanModel } from "../../../modules/global/plans/models/plans.model.js";
import { getTenantSubscriptionModel } from "../../../modules/global/plans/models/tenantSubscription.model.js";
import { ensureDefaultTrialPlan } from "../../../modules/global/plans/services/plan.service.js";
import { initializeTenantBilling } from "../../../modules/global/plans/services/subscription.service.js";

/**
 * Super Admin & IAM Baseline Seeder
 *
 * Initializes:
 *  1. Global System Roles   — with level + category fields
 *  2. Baseline IAM Policies — aligned with POLICY_TEMPLATES structure
 *  3. Global Super Admin    — platform owner account with MFA
 *
 * Role Hierarchy (level = authority; lower = more powerful):
 *  SUPER_ADMIN   level 1   category ADMIN
 *  TENANT_ADMIN  level 2   category ADMIN
 *  OWNER         level 5   category ADMIN
 *  MANAGER       level 10  category MANAGER
 *  SENIOR_WAITER level 50  category STAFF
 *  JUNIOR_WAITER level 60  category STAFF
 *  VIEWER        level 90  category VIEWER
 */
export const seedData = async () => {
  console.log("🌱 Starting System Seed...");

  const Tenant       = getTenantModel();
  const User         = getUserModel();
  const Product      = getProductModel();
  const TenantProduct = getTenantProductModel();
  const Membership   = getMembershipModel();
  const Role         = getRoleModel();
  const Policy       = getPolicyModel();
  const RolePolicy   = getRolePolicyModel();

  // ── 1. CLEANUP ─────────────────────────────────────────────────────────────
  console.log("🗑️  Cleaning up existing data...");
  await Promise.all([
    Tenant.deleteMany(),
    User.deleteMany(),
    Product.deleteMany(),
    TenantProduct.deleteMany(),
    Membership.deleteMany(),
    Role.deleteMany(),
    Policy.deleteMany(),
    RolePolicy.deleteMany(),
    getPlanModel().deleteMany(),
    getTenantSubscriptionModel().deleteMany(),
  ]);

  // ── 2. GLOBAL SYSTEM ROLES (with level + category) ────────────────────────
  console.log("🎭 Creating Global System Roles...");

  const roles = await Role.insertMany([
    // ── Platform Level ──────────────────────────────────────────────────────
    {
      name:     "Super Admin",
      code:     "SUPER_ADMIN",
      isSystem: true,
      tenantId: null,
      category: "ADMIN",
      level:    1,
    },
    {
      name:     "Tenant Admin",
      code:     "TENANT_ADMIN",
      isSystem: true,
      tenantId: null,
      category: "ADMIN",
      level:    2,
    },
    {
      name:     "Owner",
      code:     "OWNER",
      isSystem: true,
      tenantId: null,
      category: "ADMIN",
      level:    5,
    },

    // ── Management Level ────────────────────────────────────────────────────
    {
      name:     "Manager",
      code:     "MANAGER",
      isSystem: true,
      tenantId: null,
      category: "MANAGER",
      level:    CATEGORY_LEVEL_MAP.MANAGER,  // 10
    },

    // ── Staff Level (Waiter Hierarchy) ──────────────────────────────────────
    // These are global TEMPLATES. Tenants can create their own custom variants.
    // A Senior Waiter (level 50) can manage Junior Waiter (level 60) but NOT Manager (level 10).
    {
      name:     "Senior Waiter",
      code:     "SENIOR_WAITER",
      isSystem: true,
      tenantId: null,
      category: "STAFF",
      level:    CATEGORY_LEVEL_MAP.STAFF,    // 50
    },
    {
      name:     "Junior Waiter",
      code:     "JUNIOR_WAITER",
      isSystem: true,
      tenantId: null,
      category: "STAFF",
      level:    60,                          // One step below SENIOR_WAITER
    },

    // ── Read-Only Level ─────────────────────────────────────────────────────
    {
      name:     "Viewer",
      code:     "VIEWER",
      isSystem: true,
      tenantId: null,
      category: "VIEWER",
      level:    CATEGORY_LEVEL_MAP.VIEWER,   // 90
    },
  ]);

  // Build a lookup map: code → _id
  const roleMap = {};
  roles.forEach((r) => (roleMap[r.code] = r._id));

  // ── 3. BASELINE IAM POLICIES ───────────────────────────────────────────────
  console.log("🛡️  Creating Baseline IAM Policies...");

  // A. SUPER_ADMIN / TENANT_ADMIN / OWNER — Full Platform Access
  const fullAccessPolicy = await Policy.create({
    name:     "GlobalFullAccess",
    type:     "MANAGED",
    tenantId: null,
    statements: [
      { effect: "ALLOW", actions: ["*"], resources: ["*"] },
    ],
  });

  // B. MANAGER — Operational authority, no role/policy mutations
  const managerPolicy = await Policy.create({
    name:     "ManagerBasePolicy",
    type:     "MANAGED",
    tenantId: null,
    statements: [
      {
        effect:  "ALLOW",
        actions: [
          "orders:*",
          "users:read",
          "roles:read",
          "crm:*",
          "reports:read",
        ],
        resources: ["*"],
      },
      {
        effect:  "DENY",
        actions: ["roles:create", "roles:delete", "policies:create", "policies:delete"],
        resources: ["*"],
      },
    ],
  });

  // C. SENIOR_WAITER — Can view orders, manage junior waiters' tasks, read CRM
  const seniorWaiterPolicy = await Policy.create({
    name:     "SeniorWaiterBasePolicy",
    type:     "MANAGED",
    tenantId: null,
    statements: [
      {
        effect:  "ALLOW",
        actions: [
          "orders:read",
          "orders:create",
          "orders:update",
          "tables:read",
          "tables:update",
          "crm:read",
        ],
        resources: ["*"],
      },
      {
        // Senior Waiters cannot touch user/role/policy management
        effect:  "DENY",
        actions: ["users:*", "roles:*", "policies:*", "orders:delete"],
        resources: ["*"],
      },
    ],
  });

  // D. JUNIOR_WAITER — Minimal operational access
  const juniorWaiterPolicy = await Policy.create({
    name:     "JuniorWaiterBasePolicy",
    type:     "MANAGED",
    tenantId: null,
    statements: [
      {
        effect:  "ALLOW",
        actions: [
          "orders:read",
          "orders:create",
          "tables:read",
        ],
        resources: ["*"],
      },
      {
        effect:  "DENY",
        actions: [
          "orders:update",
          "orders:delete",
          "users:*",
          "roles:*",
          "policies:*",
          "crm:*",
          "reports:*",
        ],
        resources: ["*"],
      },
    ],
  });

  // E. VIEWER — Read-only across everything
  const viewerPolicy = await Policy.create({
    name:     "ViewerBasePolicy",
    type:     "MANAGED",
    tenantId: null,
    statements: [
      {
        effect:  "ALLOW",
        actions: ["orders:read", "tables:read", "crm:read", "reports:read", "roles:read", "users:read"],
        resources: ["*"],
      },
      {
        effect:  "DENY",
        actions: ["*:create", "*:update", "*:delete"],
        resources: ["*"],
      },
    ],
  });

  // ── 4. ATTACH POLICIES TO ROLES ────────────────────────────────────────────
  console.log("🔗 Linking Policies to Roles...");

  await RolePolicy.insertMany([
    // ADMIN-tier roles all get full access
    { roleId: roleMap["SUPER_ADMIN"],   policyId: fullAccessPolicy._id },
    { roleId: roleMap["TENANT_ADMIN"],  policyId: fullAccessPolicy._id },
    { roleId: roleMap["OWNER"],         policyId: fullAccessPolicy._id },

    // Management
    { roleId: roleMap["MANAGER"],       policyId: managerPolicy._id },

    // Waiter hierarchy
    { roleId: roleMap["SENIOR_WAITER"], policyId: seniorWaiterPolicy._id },
    { roleId: roleMap["JUNIOR_WAITER"], policyId: juniorWaiterPolicy._id },

    // Read-only
    { roleId: roleMap["VIEWER"],        policyId: viewerPolicy._id },
  ]);

  // ── 5. SEED PRODUCTS ───────────────────────────────────────────────────────
  console.log("🛒 Creating Products...");
  const kitchenApp = await Product.create({
    name: "Anas Kitchen",
    code: "ANAS_KITCHEN",
    description: "Core restaurant management application",
    isActive: true,
  });

  // ── 6. SUPER ADMIN USER ────────────────────────────────────────────────────
  console.log("👤 Creating Global Super Admin Account...");

  const password  = await hashPassword("123456");
  const mfaSecret = speakeasy.generateSecret({ name: "MSaas (jraman@lhsindia.com)" });

  const superAdmin = await User.create({
    email:            "jraman@lhsindia.com",
    password,
    mfaEnabled:       true,
    mfaSecret:        mfaSecret.base32,
    isFirstTimeLogin: false,
  });

  // ── 6. GLOBAL MEMBERSHIP (platform-level, no tenant) ──────────────────────
  await Membership.create({
    userId:   superAdmin._id,
    roleId:   roleMap["SUPER_ADMIN"],
    tenantId: null,
    isActive: true,
  });

  // ── DONE (base) ────────────────────────────────────────────────────────────

  // ── 7. SEED SUBSCRIPTION PLANS ─────────────────────────────────────────────
  console.log("💳 Seeding Subscription Plans...");

  // Ensure the default STARTER_TRIAL plan exists (idempotent)
  const starterTrial = await ensureDefaultTrialPlan();

  // Seed additional named plans for development visibility
  const Plan = getPlanModel();
  await Plan.findOneAndUpdate(
    { code: "GROWTH" },
    {
      name: "Growth",
      code: "GROWTH",
      description: "For growing businesses",
      isActive: true,
      price: 999,
      billingCycle: "monthly",
      maxUsers: 25,
      maxProducts: 5,
      isTrialPlan: false,
      trialDays: 0,
    },
    { upsert: true, new: true }
  );

  await Plan.findOneAndUpdate(
    { code: "ENTERPRISE" },
    {
      name: "Enterprise",
      code: "ENTERPRISE",
      description: "For large-scale operations",
      isActive: true,
      price: 4999,
      billingCycle: "monthly",
      maxUsers: 0,     // 0 = unlimited
      maxProducts: 0,  // 0 = unlimited
      isTrialPlan: false,
      trialDays: 0,
    },
    { upsert: true, new: true }
  );

  console.log("  ✅ Plans seeded: STARTER_TRIAL, GROWTH, ENTERPRISE");

  // ── 8. BACKFILL SUBSCRIPTIONS FOR ALL SEEDED TENANTS ───────────────────────
  console.log("🔗 Backfilling subscriptions for all tenants...");

  const allTenants = await Tenant.find({ isActive: true }).lean();

  const results = await Promise.allSettled(
    allTenants.map((tenant) => initializeTenantBilling(tenant._id))
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed    = results.filter((r) => r.status === "rejected");

  console.log(`  ✅ Subscriptions backfilled: ${succeeded}/${allTenants.length}`);
  if (failed.length > 0) {
    failed.forEach((f, i) => console.warn(`  ⚠️  Tenant ${i} failed:`, f.reason?.message));
  }

  // ── DONE ───────────────────────────────────────────────────────────────────
  console.log("\n✅ Seed Complete!");
  console.log("─────────────────────────────────────────────");
  console.log("Super Admin : jraman@lhsindia.com");
  console.log("Password    : 123456");
  console.log("MFA         : Enabled — scan QR or check mfaSecret.base32 in DB");
  console.log("─────────────────────────────────────────────");
  console.log("\n📋 System Roles Seeded:");
  console.log("  Level 1  | SUPER_ADMIN   | ADMIN   category | GlobalFullAccess");
  console.log("  Level 2  | TENANT_ADMIN  | ADMIN   category | GlobalFullAccess");
  console.log("  Level 5  | OWNER         | ADMIN   category | GlobalFullAccess");
  console.log("  Level 10 | MANAGER       | MANAGER category | ManagerBasePolicy");
  console.log("  Level 50 | SENIOR_WAITER | STAFF   category | SeniorWaiterBasePolicy");
  console.log("  Level 60 | JUNIOR_WAITER | STAFF   category | JuniorWaiterBasePolicy");
  console.log("  Level 90 | VIEWER        | VIEWER  category | ViewerBasePolicy");
  console.log("─────────────────────────────────────────────\n");
};
