import { getRedis } from "../../../config/redis/redis.js";
import { sendEmail } from "../../../shared/services/email/email.service.js";
import crypto from "crypto";

export const generateEmailOtp = async (user) => {
  const redis = getRedis();

  const otpKey = `otp:${user.tenantId}:${user._id}`;
  const cooldownKey = `otp_cooldown:${user.tenantId}:${user._id}`;

  // 🔒 cooldown check (30 sec)
  const cooldown = await redis.get(cooldownKey);
  if (cooldown) {
    throw new Error("Please wait before requesting another OTP");
  }

  // 🔐 secure OTP
  const otp = crypto.randomInt(100000, 1000000).toString();

  const hashedOtp = crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");

  // ✅ store OTP (5 min)
  await redis.set(otpKey, hashedOtp, { EX: 300 });

  // ✅ set cooldown (30 sec)
  await redis.set(cooldownKey, "1", { EX: 30 });

  await sendEmail({
    to: user.email,
    subject: "Your OTP",
    html: `<b>${otp}</b>`,
  });

  return otp;
};