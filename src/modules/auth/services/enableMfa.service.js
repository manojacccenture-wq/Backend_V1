
import jwt from "jsonwebtoken"
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { getRedis } from "../../../config/redis/redis.js";


export const generateMFA = async (userId, email) => {
  
   const redis = getRedis();


  const secret = speakeasy.generateSecret({
    name: `MMSAAS (${email})`,
  });

    // ✅ Store in Redis (NOT DB)
  await redis.setEx(
    `mfa:setup:${userId}`,
    300, // 5 minutes
    JSON.stringify({
      tempSecret: secret.base32,
    })
  );



  const payload = {
    userId: userId,
    "type":"mfa"
  };


  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "3m",
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  return {
    qrCode,
    token
  };
};