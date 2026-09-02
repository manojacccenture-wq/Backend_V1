import * as userService from "../../services/user.service.js";
import { generateSecurePassword } from "../../../../../shared/utils/password.utils.js";
import { sendEmail } from "../../../../../shared/services/email/email.service.js";
import { getBusinessRoleModel } from "../../../../businessRole/models/businessRole.model.js";

export const createUser = async (req, res) => {
  const { email, roleId, businessRoleId, productIds, appRoles } = req.body; 
  let { password } = req.body;
  
  const tenantId = req.context?.tenantId;

  // Generate a random password if the frontend omits it
  let isGeneratedPassword = false;
  if (!password) {
    password = generateSecurePassword(12);
    isGeneratedPassword = true;
  }

  // Combine productIds and appRoles into productAssignments
  let productAssignments = [];
  if (productIds && Array.isArray(productIds)) {
    productAssignments = productIds.map((pid, index) => {
      // If appRoles is provided and matches length, use it. Otherwise null.
      const appRole = (appRoles && appRoles.length > index) ? appRoles[index] : null;
      return { productId: pid, appRole };
    });
  }

  // 🔥 Call with individual arguments as defined in service
  const user = await userService.createTenantUser(
    email,
    password,
    tenantId,
    roleId || null,
    businessRoleId || null,
    productAssignments,
  );

  // Send Email logic
  let emailWarning = null;
  if (isGeneratedPassword) {
    try {
      let roleName = "User";
      if (businessRoleId) {
        const BusinessRole = getBusinessRoleModel();
        const role = await BusinessRole.findById(businessRoleId);
        if (role) roleName = role.name;
      }

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #4CAF50;">Welcome to Your Account</h2>
          <p>Hello,</p>
          <p>An administrator has created a new account for you.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Temporary Password:</strong> ${password}</p>
            <p><strong>Assigned Role:</strong> ${roleName}</p>
          </div>
          <p>Please log in using these credentials. We highly recommend changing your password after your first login.</p>
          <p>Regards,<br/>The MSAAS Team</p>
        </div>
      `;

      await sendEmail({
        to: email,
        subject: "Your new account credentials",
        html: emailHtml
      });
    } catch (error) {
      console.error("[createUser] Failed to send welcome email:", error.message);
      emailWarning = "User created successfully, but the welcome email failed to send.";
    }
  }

  res.json({
    success: true,
    message: emailWarning || "User created and linked to tenant successfully",
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

export const updateUser = async (req, res) => {
  const { tenantId, id } = req.params;
  const data = req.body;

  // Combine productIds and appRoles into productAssignments if provided
  if (data.productIds && Array.isArray(data.productIds)) {
    data.productAssignments = data.productIds.map((pid, index) => {
      const appRole = (data.appRoles && data.appRoles.length > index) ? data.appRoles[index] : null;
      return { productId: pid, appRole };
    });
  }

  try {
    await userService.updateUser(id, tenantId, data);
    res.json({
      success: true,
      message: "User updated successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteUser = async (req, res) => {
  const { tenantId, id } = req.params;

  try {
    await userService.deleteTenantUser(id, tenantId);
    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};