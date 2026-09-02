import { provisionFoodERPUser, deprovisionFoodERPUser } from "../../../../shared/services/fooderp/fooderpProvisioning.service.js";
import { getUserModel } from "../models/user.model.js";
import { getMembershipModel } from "../../membership/models/membership.model.js";
import { hashPassword } from "../../../../shared/services/hashPassword/hash.service.js";
import { getBusinessRoleModel } from "../../../businessRole/models/businessRole.model.js";
import { getTenantProductModel } from "../../tenantProduct/models/tenantProduct.model.js";
import { getUserProductModel } from "../../userProduct/models/userProduct.model.js";

// ✅ Email regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ✅ Password regex (min 8, upper, lower, number)
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;


export const createTenantUser = async (email, password, tenantId, roleId = null, businessRoleId = null, productAssignments = [], session) => {

  const User = getUserModel();
  const Membership = getMembershipModel();
  const TenantProduct = getTenantProductModel();
  const UserProduct = getUserProductModel();

  //  1. VALIDATIONS

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }

  if (!passwordRegex.test(password)) {
    throw new Error(
      "Password must be at least 8 characters, include uppercase, lowercase, and a number"
    );
  }

  email = email.trim().toLowerCase();

  // Validate businessRoleId if provided
  if (businessRoleId) {
    const BusinessRole = getBusinessRoleModel();
    const role = await BusinessRole.findOne({ _id: businessRoleId, tenantId }).session(session);
    if (!role) {
      throw new Error("Invalid Business Role or Role does not belong to this tenant");
    }
  }

  let user = await User.findOne({ email }).session(session);

  //  CREATE USER IF NOT EXISTS
  if (!user) {
    const hashedPassword = await hashPassword(password);

    const users = await User.create(
      [
        {
          email,
          password: hashedPassword,
        },
      ],
      { session }
    );

    user = users[0];
  }


  // 🔥 MUST include session
  const existingMembership = await Membership.findOne({
    userId: user._id,
    tenantId,
  }).session(session);


  if (existingMembership) {
    throw new Error("User already exists in this tenant");
  }

  await Membership.create(
    [
      {
        userId: user._id,
        tenantId,
        roleId,
        businessRoleId,
      },
    ],
    { session }
  );

  if (productAssignments && productAssignments.length > 0) {
    // Determine if it's an array of strings (old format) or objects (new format)
    const isOldFormat = typeof productAssignments[0] === 'string';
    const productIds = isOldFormat ? productAssignments : productAssignments.map(p => p.productId);

    const validTenantProducts = await TenantProduct.find({
      tenantId,
      productId: { $in: productIds },
      isEnabled: true,
    }).session(session);

    if (validTenantProducts.length !== productIds.length) {
      throw new Error("One or more invalid products for this workspace");
    }

    const userProductsToInsert = productAssignments.map((assignment) => {
      const pId = typeof assignment === 'string' ? assignment : assignment.productId;
      const appRole = typeof assignment === 'string' ? null : (assignment.appRole || null);
      
      return {
        userId: user._id,
        tenantId,
        productId: pId,
        isActive: true,
        appRole: appRole
      };
    });

    await UserProduct.insertMany(userProductsToInsert, { session });
  }

  // ── Provision FoodERP user if any product has an AppRole ──
  // Step 1: /api/sso/provision creates FoodERP user with its own GUID
  // Step 2: /api/sso/provision-user creates FranchiseeUsers with OperationalRole
  if (productAssignments && productAssignments.length > 0) {
    const foodErpAssignment = productAssignments.find(a => a.appRole);
    if (foodErpAssignment) {
      try {
        await provisionFoodERPUser(user.email, null, tenantId, foodErpAssignment.appRole);
      } catch (err) {
        console.error(`[FoodERP] Provisioning failed for ${user.email}: ${err.message}`);
        // Non-fatal: user is still created in MSAAS; SSO Exchange will provision on first launch
      }
    }
  }

  return user;
};

export const createUserIfNotExists = async (email, password, session) => {

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  if (!emailRegex.test(email)) {
    throw new Error("Invalid email format");
  }

  if (!passwordRegex.test(password)) {
    throw new Error(
      "Password must be at least 8 characters, include uppercase, lowercase, and a number"
    );
  }

  const User = getUserModel();

  email = email.trim().toLowerCase();

  let user = await User.findOne({ email }).session(session);

  if (!user) {
    const hashedPassword = await hashPassword(password);

    const users = await User.create(
      [{ email, password: hashedPassword }],
      { session }
    );
    
    
    user = users[0];
  }

  return user;
};

export const createMembership = async (userId, tenantId, roleId, session) => {
  const Membership = getMembershipModel();

  const existingMembership = await Membership.findOne({
    userId,
    tenantId,
  }).session(session);

  if (existingMembership) {
    throw new Error("User already exists in this tenant");
  }

  await Membership.create(
    [{ userId, tenantId, roleId }],
    { session }
  );
};

export const createPlatformUser = async (email, password) => {
  const User = getUserModel();

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await hashPassword(password);

  return User.create({
    email,
    password: hashedPassword,
    isPlatformUser: true, // optional flag
  });
};

export const getTenantUsers = async ({ tenantId, page = 1, limit = 10 }) => {
  const Membership = getMembershipModel();

  const skip = (page - 1) * limit;

  const [members, total] = await Promise.all([
    Membership.find({ tenantId })
      .populate("userId", "email isActive")
      .populate("roleId", "name")
      .populate("businessRoleId", "name")
      .skip(skip)
      .limit(limit)
      .lean(),

    Membership.countDocuments({ tenantId }),
  ]);

  const UserProduct = getUserProductModel();
  const userProducts = await UserProduct.find({ tenantId }).lean();

  const mappedMembers = members.map(m => {
    const userProductsForUser = userProducts.filter(up => up.userId.toString() === m.userId._id.toString());
    const productsForUser = userProductsForUser.map(up => up.productId.toString());
    const appRolesForUser = userProductsForUser.map(up => up.appRole || null);
      
    return {
      ...m,
      productIds: productsForUser,
      appRoles: appRolesForUser
    };
  });

  return {
    data: mappedMembers,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

export const updateUser = async (userId, tenantId, data) => {
  const User = getUserModel();
  const Membership = getMembershipModel();

  // 1. Update User core fields
  const userUpdates = {};
  if (data.email) userUpdates.email = data.email;
  if (data.password) {
    userUpdates.password = await hashPassword(data.password);
  }

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(userId, userUpdates, { new: true });
  }

  // 2. Update Membership fields (e.g. businessRoleId)
  if (data.businessRoleId) {
    await Membership.findOneAndUpdate(
      { userId, tenantId },
      { businessRoleId: data.businessRoleId },
      { new: true }
    );
  }

  // 3. Update UserProduct assignments
  if (data.productAssignments !== undefined || data.productIds !== undefined) {
    const assignments = data.productAssignments || data.productIds;
    const UserProduct = getUserProductModel();
    const TenantProduct = getTenantProductModel();
    
    // Clear existing assignments for this user in this tenant
    await UserProduct.deleteMany({ userId, tenantId });
    
    if (assignments.length > 0) {
      const isOldFormat = typeof assignments[0] === 'string';
      const productIds = isOldFormat ? assignments : assignments.map(p => p.productId);

      // Validate that these products are actually enabled for the tenant
      const validTenantProducts = await TenantProduct.find({
        tenantId,
        productId: { $in: productIds },
        isEnabled: true,
      });

      if (validTenantProducts.length !== productIds.length) {
        throw new Error("One or more invalid products for this workspace");
      }

      const userProductsToInsert = assignments.map((assignment) => {
        const pId = typeof assignment === 'string' ? assignment : assignment.productId;
        const appRole = typeof assignment === 'string' ? null : (assignment.appRole || null);
        
        return {
          userId,
          tenantId,
          productId: pId,
          isActive: true,
          appRole: appRole
        };
      });

      await UserProduct.insertMany(userProductsToInsert);
    }
  }

  return { success: true };
};

export const deleteTenantUser = async (userId, tenantId) => {
  const Membership = getMembershipModel();
  const User = getUserModel();

  // Look up email before deletion so FoodERP can find the user by email fallback
  const userDoc = await User.findById(userId).select("email").lean();
  const email = userDoc?.email || null;

  await Membership.deleteOne({ userId, tenantId });

  // 🔥 DEPROVISION FOODERP USER
  await deprovisionFoodERPUser(tenantId, userId, email);

  return { success: true };
};