import { getMembershipModel } from "../../global/membership/models/membership.model";


export const contextMiddleware = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const tenantId = req.headers["x-tenant-id"];

    const Membership = getMembershipModel();

    const memberships = await Membership.find({
      userId,
      isActive: true,
    }).populate("roleId");

    // 🔥 SUPER ADMIN CHECK
    const superAdmin = memberships.find(
      (m) => !m.tenantId
    );

    if (superAdmin) {
      req.context = {
        role: superAdmin.roleId.name,
        isSuperAdmin: true,
      };
      return next();
    }

    // 🔥 TENANT ROLE
    const tenantMembership = memberships.find(
      (m) => m.tenantId?.toString() === tenantId
    );

    if (!tenantMembership) {
      return res.status(403).json({ msg: "No access to tenant" });
    }

    req.context = {
      role: tenantMembership.roleId.name,
      tenantId,
      isSuperAdmin: false,
    };

    next();
  } catch (err) {
    res.status(500).json({ msg: "Context error" });
  }
};