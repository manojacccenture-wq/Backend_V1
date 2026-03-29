import speakeasy from "speakeasy";
import { getUserModel } from "../../global/users/models/user.model.js";
import { getRedis } from "../../../config/redis/redis.js";
import crypto from "crypto";
import logger from "../../../shared/services/logger/logger.js";

export const verifyLoginService = async (userId, otp, type) => {
  logger.info("Verifying login MFA", { userId, type });
  logger.info("OTP received", { otp });
  const User = getUserModel();

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // =========================
  // MFA (TOTP)
  // =========================
  if (type === "mfa") {

    if (!user.mfaSecret) {
      throw new Error("MFA not properly configured");
    }

    logger.info("SECRET DEBUG", {
      mfaSecret: user.mfaSecret,
    });
    const verified = speakeasy.totp({
      secret: user.mfaSecret,
      encoding: "base32",
      token: String(otp), // 🔥 force string
      window: 1,
    });

    if (!verified) throw new Error("Invalid OTP");
  }

  // =========================
  // EMAIL OTP
  // =========================
  else if (type === "email_otp") {
    const redis = getRedis();

    const key = `otp:${user.tenantId}:${userId}`;

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

  return user;
};