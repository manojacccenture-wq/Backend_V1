export const authorize = (requiredPermission) => {
  return (req, res, next) => {
    try {
      const { contexts, rolePermissionsMap } = req.user;
      const tenantId = req.headers["x-tenant-id"];

      // 🔥 SUPER ADMIN
      const isSuperAdmin = contexts.some(c => !c.tenantId);
      if (isSuperAdmin) return next();

      // 🔥 FIND CONTEXT
      const context = contexts.find(
        c => c.tenantId?.toString() === tenantId
      );

      if (!context) {
        return res.status(403).json({ msg: "No tenant access" });
      }

      // 🔥 PERMISSION CHECK (NO DB)
      const permissions = rolePermissionsMap?.[context.role] || [];

      if (!permissions.includes(requiredPermission)) {
        return res.status(403).json({ msg: "Forbidden" });
      }

      next();
    } catch (err) {
      res.status(500).json({ msg: "Authorization error" });
    }
  };
};