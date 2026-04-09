import { getMembershipModel } from "../../modules/global/membership/models/membership.model.js";
import { getPermissionModel } from "../../modules/global/permission/models/permission.model.js";
import { getProductModel } from "../../modules/global/products/models/product.model.js";
import { getRolePermissionModel } from "../../modules/global/roles/models/rolePermission.model.js";
import { getRoleModel } from "../../modules/global/roles/models/roles.models.js";
import { getTenantModel } from "../../modules/global/tenant/models/tenant.model.js";
import { getTenantProductModel } from "../../modules/global/tenantProduct/models/tenantProduct.model.js";
import { getUserProductModel } from "../../modules/global/userProduct/models/userProduct.model.js";
import { getUserModel } from "../../modules/global/users/models/user.model.js";


export const initModels = () => {
  console.log("🔄 Initializing models...");

  //  Register all models
  getUserModel();
  getTenantModel();
  getProductModel();
  getTenantProductModel();
  getUserProductModel();

  getRoleModel();
  getPermissionModel();
  getRolePermissionModel();
  getMembershipModel();

  console.log("✅ Models initialized");
};