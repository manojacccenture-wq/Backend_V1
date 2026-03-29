import jwt from "jsonwebtoken";

export const generateTempToken = (userId, type) => {
  return jwt.sign(
    { userId, type },
    process.env.JWT_SECRET,
    { expiresIn: "5m" }
  );
};

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      tenantId: user.tenantId,
      products: user.products,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};
