import mongoose from "mongoose";

import { getPermissionModel } from "../../../modules/global/permission/models/permission.model.js";
import { getRoleModel } from "../../../modules/global/roles/models/roles.models.js";
import { getRolePermissionModel } from "../../../modules/global/roles/models/rolePermission.model.js";

export const seedRBAC = async () => {
  console.log("🌱 Seeding RBAC...");

  const Permission = getPermissionModel();
  const Role = getRoleModel();
  const RolePermission = getRolePermissionModel();

  // clear old
  await Permission.deleteMany();
  await Role.deleteMany();
  await RolePermission.deleteMany();

  // =========================
  // PERMISSIONS
  // =========================
  const permissions = await Permission.insertMany([
    { name: "user:create" },
    { name: "user:view" },
    { name: "user:update" },
    { name: "user:delete" },

    { name: "product:create" },
    { name: "product:view" },
    { name: "product:update" },
    { name: "product:delete" },
  ]);


  const permMap = {};
  permissions.forEach((p) => {
    permMap[p.name] = p._id;
  });

  // =========================
  // ROLES
  // =========================
  const roles = await Role.insertMany([
    { name: "SUPER_ADMIN", scope: "platform", isSystem: true },

    { name: "TENANT_ADMIN", scope: "tenant" },

    { name: "PRODUCT_ADMIN", scope: "product" },

    { name: "PRODUCT_USER", scope: "product" },
  ]);

  const roleMap = {};
  roles.forEach((r) => {
    roleMap[r.name] = r._id;
  });

  // =========================
  // ROLE PERMISSIONS
  // =========================
const rolePermissions = [];

// SUPER ADMIN
permissions.forEach((perm) => {
  rolePermissions.push({
    roleId: roleMap["SUPER_ADMIN"],
    permissionId: perm._id,
  });
});

  // TENANT ADMIN
  rolePermissions.push(
    {
      roleId: roleMap["TENANT_ADMIN"],
      permissionId: permMap["user:create"],
    },
    {
      roleId: roleMap["TENANT_ADMIN"],
      permissionId: permMap["user:view"],
    }
  );

  // PRODUCT ADMIN
  rolePermissions.push(
    {
      roleId: roleMap["PRODUCT_ADMIN"],
      permissionId: permMap["product:create"],
    },
    {
      roleId: roleMap["PRODUCT_ADMIN"],
      permissionId: permMap["product:view"],
    }
  );

  // PRODUCT USER
  rolePermissions.push({
    roleId: roleMap["PRODUCT_USER"],
    permissionId: permMap["product:view"],
  });

  await RolePermission.insertMany(rolePermissions);

  console.log("✅ RBAC Seeded Successfully");
};