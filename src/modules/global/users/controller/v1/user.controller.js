import * as userService from "../../services/user.service.js";

export const createUser = async (req, res) => {
  const { email, password, roleId } = req.body;

  const user = await userService.createTenantUser({
    email,
    password,
    tenantId: req.tenantId,
    roleId,
  });

  res.json(user);
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