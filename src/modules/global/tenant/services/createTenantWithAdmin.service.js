
import { createTenant, createTenantDatabase } from "./tenant.service.js";
import { createMembership } from "../../membership/services/createmembership.service.js";
import { getGlobalDB } from "../../../../config/db/db.js";
import { getMembershipModel } from "../../membership/models/membership.model.js";
import { getRoleModel } from "../../roles/models/roles.models.js";
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
    //  1. Get OWNER role (cached)
    const ownerRoleId = await getOwnerRoleId();




    // 🔹 1. USER
    const user = await createUserIfNotExists(email, password, session);

    // ⚡ 3. Redis fast check
    const ownerKey = `user:${user._id}:ownerTenant`;

    const cachedOwner = await redis.get(ownerKey);
    if (cachedOwner) {
      throw new Error("User already owns a tenant");
    }


    //  2. OWNER CHECK
    const existingOwner = await Membership.findOne({
      userId: user._id,
      roleId: ownerRoleId, // ensure this is OWNER role
    }).session(session);

    if (existingOwner) {
      throw new Error("User already owns a tenant");
    }

    // 🔹 3. TENANT
    const tenant = await createTenant({ name, dataMode }, session);

    // 🔹 4. MEMBERSHIP
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