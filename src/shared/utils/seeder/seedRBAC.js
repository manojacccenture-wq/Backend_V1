import mongoose from "mongoose";

import { getPermissionModel } from "../../../modules/global/permission/models/permission.model.js";
import { getRoleModel } from "../../../modules/global/roles/models/roles.models.js";
import { getRolePermissionModel } from "../../../modules/global/roles/models/rolePermission.model.js";

export const seedRBAC = async () => {
  console.log("🌱 Seeding RBAC...");

  const Permission = getPermissionModel();
  const Role = getRoleModel();
  const RolePermission = getRolePermissionModel();

  await Promise.all([
    Permission.deleteMany(),
    Role.deleteMany(),
    RolePermission.deleteMany(),
  ]);

  // =========================
  // 🔐 PERMISSIONS
  // =========================

  const permissions = await Permission.insertMany([
    { name: "user:create" },
    { name: "user:view" },
    { name: "user:update" },
    { name: "user:delete" },
    { name: "product:create" },
    { name: "product:view" },
  ]);

  const permMap = {};
  permissions.forEach((p) => (permMap[p.name] = p._id));

  // =========================
  // 👤 ROLES (WITH CODE ✅)
  // =========================

  const roles = await Role.insertMany([
    {
      name: "super_admin",
      code: "SUPER_ADMIN", // 🔥 important
      isSystem: true,
    },
    {
      name: "tenant_admin",
      code: "TENANT_ADMIN",
    },
    {
      name: "product_admin",
      code: "PRODUCT_ADMIN",
    },
    {
      name: "product_user",
      code: "PRODUCT_USER",
    },
  ]);

  const roleMap = {};
  roles.forEach((r) => (roleMap[r.code] = r._id)); // 🔥 use code instead of name

  // =========================
  // 🔗 ROLE PERMISSIONS
  // =========================

  await RolePermission.insertMany([
    {
      roleId: roleMap["SUPER_ADMIN"],
      permissions: permissions.map((p) => p._id),
    },
    {
      roleId: roleMap["TENANT_ADMIN"],
      permissions: [permMap["user:create"], permMap["user:view"]],
    },
    {
      roleId: roleMap["PRODUCT_ADMIN"],
      permissions: [permMap["product:create"], permMap["product:view"]],
    },
    {
      roleId: roleMap["PRODUCT_USER"],
      permissions: [permMap["product:view"]],
    },
  ]);

  console.log("✅ RBAC Seeded Successfully");
};