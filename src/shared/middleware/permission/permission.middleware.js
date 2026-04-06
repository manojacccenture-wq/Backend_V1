export const checkPermission = (permission) => {
  return (req, res, next) => {
    const perms = req.user.permissions || [];

    if (perms.includes("*") || perms.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      msg: "Forbidden - insufficient permission",
    });
  };
};