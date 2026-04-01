import speakeasy from "speakeasy";
import { getUserModel } from "../../global/users/models/user.model.js";
import { getRedis } from "../../../config/redis/redis.js";
import crypto from "crypto";


export const verifyLoginService = async (userId, otp, type) => {
  


  const redis = getRedis();

  const sessionKey = `auth:session:${userId}`;
  const sessionData = await redis.get(sessionKey);
  

  if (!sessionData) {
    throw new Error("Session expired. Please login again.");
  }


  const session = JSON.parse(sessionData);
  // 🚨 VALIDATE TYPE FROM SESSION
  
  if (session.type !== type) {
    throw new Error("Invalid authentication flow");
  }

  // =========================
  // MFA (TOTP)
  // =========================
  if (type === "mfa") {

    if (!session.mfaSecret) {
      throw new Error("MFA not properly configured");
    }


    const verified = speakeasy.totp.verify({
      secret: session.mfaSecret,
      encoding: "base32",
      token: String(otp), // 🔥 force string
      window: 1, // allow 30s before or after
    });
    

    if (!verified) throw new Error("Invalid OTP");
  }

  // =========================
  // EMAIL OTP
  // =========================
  else if (type === "email_otp") {
    const redis = getRedis();

    const key = `auth:otp:${session.tenantId}:${userId}`;

    const storedOtp = await redis.get(key);




    if (!storedOtp) {
      throw new Error("OTP expired or not found");
    }

    const hashedInput = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    if (storedOtp !== hashedInput) {
      throw new Error("Invalid OTP");
    }

    // ✅ delete after success
    await redis.del(key);
  }

  else {
    throw new Error("Invalid token type");
  }

  await redis.del(`auth:session:${userId}`);

  return {
    _id: session.userId,
    tenantId: session.tenantId,
    email: session.email,
    isFirstTimeLogin: session.isFirstTimeLogin
  };
};