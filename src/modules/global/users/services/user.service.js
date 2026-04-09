import { getUserModel } from "../models/user.model.js";
import { getMembershipModel } from "../../membership/models/membership.model.js";
import { hashPassword } from "../../../../shared/services/hashPassword/hash.service.js";


// ✅ Email regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ✅ Password regex (min 8, upper, lower, number)
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;


export const createTenantUser = async (email, password, tenantId, roleId, session) => {



  const User = getUserModel();
  const Membership = getMembershipModel();

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
      },
    ],
    { session }
  );



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
      .skip(skip)
      .limit(limit)
      .lean(),

    Membership.countDocuments({ tenantId }),
  ]);

  return {
    data: members,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

export const updateUser = async (userId, data) => {
  const User = getUserModel();

  return User.findByIdAndUpdate(userId, data, { new: true });
};


export const deleteTenantUser = async (userId, tenantId) => {
  const Membership = getMembershipModel();

  await Membership.deleteOne({ userId, tenantId });

  return { success: true };
};