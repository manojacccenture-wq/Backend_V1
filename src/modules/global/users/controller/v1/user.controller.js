import * as userService from "../../services/user.service.js";

export const createUser = async (req, res) => {
  const { email, password, roleId, businessRoleId } = req.body; // allow both old roleId and new businessRoleId
  console.log('businessRoleId: ', businessRoleId)
  
  
  
  const tenantId = req.context?.tenantId;

  // 🔥 Call with individual arguments as defined in service
  const user = await userService.createTenantUser(
    email,
    password,
    tenantId,
    roleId || null,
    businessRoleId || null
  );

  res.json({
    success: true,
    message: "User created and linked to tenant successfully",
    data: user
  });
};

export const getUsers = async (req, res) => {
  const { page, limit } = req.query;

  const data = await userService.getTenantUsers({
    tenantId: req.tenantId,
    page: Number(page),
    limit: Number(limit),
  });

  res.json(data);
};

export const resetUserTotp = async (req, res) => {
  const { id } = req.params;
  const adminTenantId = req.context?.tenantId;
  
  if (!adminTenantId) {
    return res.status(403).json({ success: false, message: "Super admin resets must use the global CLI" });
  }

  // Find the target user's membership to ensure they belong to this tenant
  const { getMembershipModel } = await import("../../membership/models/membership.model.js");
  const Membership = getMembershipModel();
  const membership = await Membership.findOne({ userId: id, tenantId: adminTenantId });
  
  if (!membership) {
    return res.status(404).json({ success: false, message: "User not found in this tenant" });
  }

  const { getUserModel } = await import("../models/user.model.js");
  const User = getUserModel();
  
  await User.updateOne(
    { _id: id },
    {
      $set: {
        mfaEnabled: false,
        isFirstTimeLogin: true,
      },
      $unset: {
        mfaSecret: "",
        mfaTempSecret: "",
      },
      $pull: {
        backupCodes: { $exists: true } // clears the array
      }
    }
  );

  // TODO: Emulate an Audit Log here "ACTION: TOTP_RESET"
  console.log(`[AUDIT] ACTION: TOTP_RESET, ACTOR: ${req.user.userId}, TARGET: ${id}, TENANT: ${adminTenantId}`);

  res.json({
    success: true,
    message: "User Two-Factor Authentication has been reset successfully"
  });
};