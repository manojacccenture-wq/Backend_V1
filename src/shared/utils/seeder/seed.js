import speakeasy from "speakeasy";
import { getTenantModel } from "../../../modules/global/tenant/models/tenant.model.js";
import { getUserModel } from "../../../modules/global/users/models/user.model.js";
import { getProductModel } from "../../../modules/global/products/models/product.model.js";
import { getTenantProductModel } from "../../../modules/global/tenantProduct/models/tenantProduct.model.js";
import { getMembershipModel } from "../../../modules/global/membership/models/membership.model.js";
import { getRoleModel } from "../../../modules/global/roles/models/roles.models.js";
import { getPolicyModel } from "../../../modules/iam/models/policy.model.js";
import { getRolePolicyModel } from "../../../modules/iam/models/rolePolicy.model.js";
import { hashPassword } from "../../services/hashPassword/hash.service.js";

/**
 * Super Admin & IAM Baseline Seeder
 * 
 * This seeder initializes:
 * 1. Global Super Admin (Platform Owner)
 * 2. Shared System Roles (SUPER_ADMIN, TENANT_ADMIN, WAITER)
 * 3. Baseline IAM Policies (Full Access, Waiter Limited)
 */
export const seedData = async () => {
  console.log("🌱 Starting System Seed...");

  const Tenant = getTenantModel();
  const User = getUserModel();
  const Product = getProductModel();
  const TenantProduct = getTenantProductModel();
  const Membership = getMembershipModel();
  const Role = getRoleModel();
  const Policy = getPolicyModel();
  const RolePolicy = getRolePolicyModel();

  // 1. CLEANUP PREVIOUS DATA
  console.log("🗑️ Cleaning up existing data...");
  await Promise.all([
    Tenant.deleteMany(),
    User.deleteMany(),
    Product.deleteMany(),
    TenantProduct.deleteMany(),
    Membership.deleteMany(),
    Role.deleteMany(),
    Policy.deleteMany(),
    RolePolicy.deleteMany(),
  ]);

  // 2. CREATE SYSTEM-WIDE GLOBAL ROLES
  console.log("🎭 Creating Global System Roles...");
  const roles = await Role.insertMany([
    { name: "Super Admin", code: "SUPER_ADMIN", isSystem: true, tenantId: null },
    { name: "Tenant Admin", code: "TENANT_ADMIN", isSystem: true, tenantId: null },
    { name: "Owner", code: "OWNER", isSystem: true, tenantId: null },
    { name: "Waiter", code: "WAITER", isSystem: true, tenantId: null },
  ]);

  const roleMap = {};
  roles.forEach(r => roleMap[r.code] = r._id);

  // 3. CREATE BASELINE IAM POLICIES
  console.log("🛡️ Creating Baseline IAM Policies...");
  
  // A. Global Full Access (for Super Admins)
  const fullAccessPolicy = await Policy.create({
    name: "GlobalFullAccess",
    type: "MANAGED",
    tenantId: null,
    statements: [{ effect: "ALLOW", actions: ["*"], resources: ["*"] }]
  });

  // B. Standard Waiter Policy (Limited Access)
  const waiterPolicy = await Policy.create({
    name: "WaiterBasePolicy",
    type: "MANAGED",
    tenantId: null,
    statements: [
      { 
        effect: "ALLOW", 
        actions: ["orders:view", "orders:create", "tables:view"], 
        resources: ["*"] 
      },
      {
        effect: "DENY",
        actions: ["orders:delete", "reports:view"],
        resources: ["*"]
      }
    ]
  });

  // 4. ATTACH BASELINE POLICIES TO ROLES
  console.log("🔗 Linking Policies to Roles...");
  await RolePolicy.insertMany([
    { roleId: roleMap["SUPER_ADMIN"], policyId: fullAccessPolicy._id },
    { roleId: roleMap["WAITER"], policyId: waiterPolicy._id }
  ]);

  // 5. CREATE GLOBAL SUPER ADMIN USER
  console.log("👤 Creating Global Super Admin Account...");
  const password = await hashPassword("123456");
  
  // Generate MFA secret for secure login
  const mfaSecret = speakeasy.generateSecret({ name: "MSaas (manojacccenture@gmail.com)" });

  const superAdmin = await User.create({
    email: "manojacccenture@gmail.com",
    password,
    mfaEnabled: true,
    mfaSecret: mfaSecret.base32,
    isFirstTimeLogin: false
  });

  // 6. ASSIGN GLOBAL MEMBERSHIP
  // This user has no tenantId, giving them Platform-wide access
  await Membership.create({
    userId: superAdmin._id,
    roleId: roleMap["SUPER_ADMIN"],
    tenantId: null, 
    isActive: true
  });

  console.log("✅ Seed Complete!");
  console.log("-----------------------------------------");
  console.log("Super Admin: manojacccenture@gmail.com");
  console.log("Password:    123456");
  console.log("Status:      MFA Enabled (Use an app or check console/DB)");
  console.log("-----------------------------------------");
};