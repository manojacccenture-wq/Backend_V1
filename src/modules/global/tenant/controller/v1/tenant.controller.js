import { createTenantWithAdmin } from "../../services/createTenantWithAdmin.service.js";
import { getTenants } from "../../services/getTenants.service.js";
import { getTenantUsers } from "../../services/getTenantUsers.service.js";
import { createTenantSchema } from "../../validation/createTenantWithAdmin.schema.js";
import { getTenantsSchema } from "../../validation/getTenants.schema.js";
import { getTenantUsersSchema } from "../../validation/getTenantUsers.schema.js";



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
