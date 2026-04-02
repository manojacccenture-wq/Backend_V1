import jwt from "jsonwebtoken";
import crypto from "crypto";


export const generateTempToken = (userId, tenantId, type) => {
  return jwt.sign(
    { userId, tenantId, type },
    process.env.JWT_SECRET,
    { expiresIn: "2m" }
  );
};

export const generateAccessToken = (user) => {
  console.log('user: Inside generateAccessToken ', user)
  return jwt.sign(
    {
      userId: user._id,
      tenantId: user.tenantId,
      products: user.products,
      email: user.email,
      type: "access",
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};


export const generateRefreshToken = (user,sessionId) => {
  return jwt.sign(
    {
      userId: user._id,
      tenantId: user.tenantId,
      sessionId: sessionId, 
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
    
  );
};

// 🔐 hash before storing in Redis
export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
