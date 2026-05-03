import * as userService from "../../services/user.service.js";

export const createUser = async (req, res) => {
  const { email, password, role } = req.body; // 'role' contains the Role ID from the frontend
  const tenantId = req.context?.tenantId;

  // 🔥 Call with individual arguments as defined in service
  const user = await userService.createTenantUser(
    email,
    password,
    tenantId,
    role
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