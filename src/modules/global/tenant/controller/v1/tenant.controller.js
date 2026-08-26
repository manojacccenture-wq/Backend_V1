import { createTenantWithAdmin } from "../../services/createTenantWithAdmin.service.js";
import { getTenants } from "../../services/getTenants.service.js";
import { getTenantUsers } from "../../services/getTenantUsers.service.js";
import { deleteTenantCascade } from "../../services/deleteTenantCascade.service.js";
import { createTenantSchema } from "../../validation/createTenantWithAdmin.schema.js";
import { getTenantsSchema } from "../../validation/getTenants.schema.js";
import { getTenantUsersSchema } from "../../validation/getTenantUsers.schema.js";
import { deleteTenantSchema } from "../../validation/deleteTenant.schema.js";



export const createTenantController = async (req, res) => {
  try {

    const parsed = createTenantSchema.parse(req.body);


    const result = await createTenantWithAdmin(parsed);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


export const getTenantsController = async (req, res, next) => {
  try {

    const parsed = getTenantsSchema.parse(req.query);

    const result = await getTenants(parsed);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error); // 🔥 use your global error middleware
  }
};


export const getTenantUsersController = async (req, res, next) => {
  try {
    const parsed = getTenantUsersSchema.parse({
      ...req.query,
      tenantId: req.params.tenantId,
    });

    const result = await getTenantUsers(parsed);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};


export const deleteTenantController = async (req, res, next) => {
  try {
    // 1. Validate superadmin
    if (!req.context?.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Only Super Admins can delete tenants",
      });
    }

    // 2. Validate tenantId param
    const parsed = deleteTenantSchema.parse({
      tenantId: req.params.tenantId,
    });

    // 3. Execute cascade delete
    const summary = await deleteTenantCascade(parsed.tenantId);

    res.status(200).json({
      success: true,
      message: "Tenant deleted successfully",
      data: summary,
    });
  } catch (error) {
    if (error.message === "Tenant not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};
