import jwt from "jsonwebtoken";
import crypto from "crypto";


export const generateTempToken = (userId, type, email) => {
  return jwt.sign(
    { userId,  type, email },
    process.env.JWT_SECRET,
    { expiresIn: "2m" }
  );
};


export const generateAccessToken = (user) => {
  
  
  
  return jwt.sign(
    {
      userId: user._id||user.userId,
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
      userId: user._id||user.userId,
      email: user.email,
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
