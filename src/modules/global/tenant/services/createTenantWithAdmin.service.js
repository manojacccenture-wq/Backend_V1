import { createTenant, createTenantDatabase } from "./tenant.service.js";
import { createMembership } from "../../membership/services/createmembership.service.js";
import { getGlobalDB } from "../../../../config/db/db.js";
import { getMembershipModel } from "../../membership/models/membership.model.js";
import { getRoleModel } from "../../roles/models/roles.models.js";
import { getProductModel } from "../../products/models/product.model.js";
import { getTenantProductModel } from "../../tenantProduct/models/tenantProduct.model.js";
import { getUserProductModel } from "../../userProduct/models/userProduct.model.js";
import { getRedis } from "../../../../config/redis/redis.js";
import { createUserIfNotExists } from "../../users/services/user.service.js";

export const getOwnerRoleId = async () => {
  const redis = getRedis();
  const cacheKey = "role:OWNER";

  let roleId = await redis.get(cacheKey);

  if (roleId) return roleId;

  const Role = getRoleModel();
  const role = await Role.findOne({ code: "TENANT_ADMIN" });

  if (!role) throw new Error("OWNER role not configured");

  await redis.set(cacheKey, role._id.toString(), {
    EX: 3600, // 1 hour
  });

  return role._id;
};


export const createTenantWithAdmin = async ({
  name,
  dataMode,
  email,
  password,
  products,
}) => {

  const redis = getRedis();


  // 🔒 Distributed lock (prevent duplicate requests)
  const lockKey = `lock:createTenant:${email}`;

  const lock = await redis.set(lockKey, "1", {
    NX: true,
    EX: 10, // 10 seconds lock
  });

  if (!lock) {
    throw new Error("Another request is in progress. Try again.");
  }

  const db = getGlobalDB();
  const session = await db.startSession();

  try {
    session.startTransaction();
    const Membership = getMembershipModel();
    const Product = getProductModel();
    const TenantProduct = getTenantProductModel();
    const UserProduct = getUserProductModel();

    //  1. Get OWNER role (cached)
    const ownerRoleId = await getOwnerRoleId();

    // 🔹 2. USER
    const user = await createUserIfNotExists(email, password, session);
    

    // ⚡ 3. Redis fast check
    const ownerKey = `user:${user._id}:ownerTenant`;

    const cachedOwner = await redis.get(ownerKey);
    if (cachedOwner) {
      throw new Error("User already owns a tenant");
    }


    //  4. OWNER CHECK
    const existingOwner = await Membership.findOne({
      userId: user._id,
      roleId: ownerRoleId, // ensure this is OWNER role
    }).session(session);

    if (existingOwner) {
      throw new Error("User already owns a tenant");
    }

    // 🔹 5. TENANT
    const tenant = await createTenant({ name, dataMode }, session);

    // 🔹 6. Validate & Assign Products
    const existingProducts = await Product.find({ code: { $in: products } }).session(session);
    if (existingProducts.length !== products.length) {
      throw new Error("One or more invalid product codes provided");
    }

    // Create TenantProducts and UserProducts
    const tenantProductsToInsert = [];
    const userProductsToInsert = [];

    existingProducts.forEach((prod) => {
      tenantProductsToInsert.push({
        tenantId: tenant._id,
        productId: prod._id,
        isEnabled: true,
      });

      userProductsToInsert.push({
        userId: user._id,
        tenantId: tenant._id,
        productId: prod._id,
        isActive: true,
      });
    });

    await TenantProduct.insertMany(tenantProductsToInsert, { session });
    await UserProduct.insertMany(userProductsToInsert, { session });

    // 🔹 7. MEMBERSHIP
    // NOTE: Owner role is global for the tenant, so productId is null
    await createMembership(user._id, tenant._id, ownerRoleId, session);

    await session.commitTransaction();
    session.endSession();

    // 🔥 5. CREATE DB AFTER COMMIT
    if (tenant.dataMode === "isolated") {
      await createTenantDatabase(tenant.dbName);
    }

    return { tenant, user };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }finally{
    await redis.del(lockKey);
  }
};