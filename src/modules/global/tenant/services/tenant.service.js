import mongoose from "mongoose";
import crypto from "crypto";
import { getTenantModel } from "../models/tenant.model.js";
import { getUserModel } from "../../users/models/user.model.js";
import { getMembershipModel } from "../../membership/models/membership.model.js";
import { hashPassword } from "../../../../shared/services/hashPassword/hash.service.js";

const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10);


export const createTenant = async (data,session) => {
  const Tenant = getTenantModel();

const tenant = await Tenant.create(
  [
    {
      name: data.name,
      dataMode: data.dataMode,
      dbName:
        data.dataMode === "isolated"
          ? `tenant_${slugify(data.name)}_${crypto
              .randomBytes(3)
              .toString("hex")}`
          : null,
      isActive: true,
    },
  ],
  { session }
);


return tenant[0];
};

export const createTenantDatabase = async (dbName) => {
  const uri = `${process.env.BASE_MONGO_URI}/${dbName}?replicaSet=rs0`;

  const conn = mongoose.createConnection(uri);

  await new Promise((resolve, reject) => {
    conn.once("open", resolve);
    conn.on("error", reject);
  });

  await conn.collection("init").insertOne({ created: true });

  await conn.close();
};



export const createTenantService = async ({
  tenantName,
  email,
  password,
  roleId,
  dataMode = "shared",
}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const Tenant = getTenantModel();
    const User = getUserModel();
    const Membership = getMembershipModel();

    // 🔥 1. VALIDATION
    if (!tenantName || !email || !password) {
      throw new Error("Tenant name, email and password are required");
    }

    // 🔥 2. CREATE TENANT
    const tenant = await Tenant.create(
      [
        {
          name: tenantName,
          dataMode,
          dbName:
            dataMode === "isolated"
              ? `tenant_${Date.now()}`
              : null,
          isActive: true,
        },
      ],
      { session }
    );

    const tenantId = tenant[0]._id;

    // 🔥 3. CHECK USER
    let user = await User.findOne({ email }).session(session);

    if (!user) {
      const hashedPassword = await hashPassword(password);

      user = await User.create(
        [
          {
            email: email.toLowerCase(),
            password: hashedPassword,
            isFirstTimeLogin: true,
          },
        ],
        { session }
      );

      user = user[0];
    }

    // 🔥 4. CHECK MEMBERSHIP DUPLICATE
    const existingMembership = await Membership.findOne({
      userId: user._id,
      tenantId,
    }).session(session);

    if (existingMembership) {
      throw new Error("User already assigned to this tenant");
    }

    // 🔥 5. CREATE MEMBERSHIP (ADMIN)
    await Membership.create(
      [
        {
          userId: user._id,
          tenantId,
          roleId, // tenant admin role
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return {
      tenant: tenant[0],
      user,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    throw error;
  }
};


export const getTenants = async ({ page = 1, limit = 10 }) => {
  const Tenant = getTenantModel();

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    Tenant.find().skip(skip).limit(limit).lean(),
    Tenant.countDocuments(),
  ]);

  return {
    data,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};


export const updateTenant = async (id, data) => {
  const Tenant = getTenantModel();

  return Tenant.findByIdAndUpdate(id, data, { new: true });
};

export const deleteTenant = async (id) => {
  const Tenant = getTenantModel();

  return Tenant.findByIdAndDelete(id);
};


