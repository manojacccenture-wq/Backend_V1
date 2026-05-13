import * as userService from "../../services/user.service.js";

export const createUser = async (req, res) => {
  const { email, password, roleId, businessRoleId } = req.body; // allow both old roleId and new businessRoleId
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