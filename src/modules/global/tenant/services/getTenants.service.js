import { getTenantModel } from "../models/tenant.model.js";

export const getTenants = async ({
  page = 1,
  limit = 10,
  search = "",
  dataMode,
  sortBy,
  isActive,
  order
}) => {
  const Tenant = getTenantModel();

  const skip = (page - 1) * limit;

  // 🔍 Build query
  const query = {};

  if (search) {
    query.name = { $regex: search, $options: "i" }; // case-insensitive
  }

  if (dataMode) {
    query.dataMode = dataMode;
  }

  if (typeof isActive !== "undefined") {
    query.isActive = isActive === "true" || isActive === true;
  }


  const sort = {
    [sortBy]: order === "asc" ? 1 : -1,
  };


  // ⚡ Parallel execution (performance)
  const [tenants, total] = await Promise.all([
    Tenant.find(query)
      .select("name dataMode dbName isActive createdAt isActive")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(), // 🔥 faster

    Tenant.countDocuments(query),
  ]);

  return {
    data: tenants,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};