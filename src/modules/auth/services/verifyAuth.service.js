import speakeasy from "speakeasy";
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
    if (String(otp).length === 9 && String(otp).includes("-")) {
       // Backup Code Verification Flow (e.g. A3K9-J8L2 is 9 chars)
       const { verifyPassword } = await import("../../../shared/services/hashPassword/hash.service.js");
       const { getUserModel } = await import("../../global/users/models/user.model.js");
       const User = getUserModel();
       const userDoc = await User.findById(userId).select("backupCodes");
       if (!userDoc || !userDoc.backupCodes || userDoc.backupCodes.length === 0) {
         throw new Error("No backup codes available");
       }

       let matchedHash = null;
       for (const hash of userDoc.backupCodes) {
         const isMatch = await verifyPassword(hash, otp);
         if (isMatch) {
           matchedHash = hash;
           break;
         }
       }

       if (!matchedHash) {
         throw new Error("Invalid backup code");
       }

       // Invalidate the code immediately
       await User.updateOne(
         { _id: userId },
         { $pull: { backupCodes: matchedHash } }
       );

    } else {
       // Standard TOTP Flow
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
  }

  // =========================
  // EMAIL OTP
  // =========================
  else if (type === "email_otp") {
    const redis = getRedis();

    const key = `auth:otp:${session.email}:${userId}`;

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

  // ✅ CLEANUP: Destroy BOTH session keys after successful login
  await redis.del(`auth:session:${userId}`);
  
  // 🔥 ADD THIS LINE: This ensures the "ghost" session is wiped out!
  await redis.del(`auth:email:${session.email}`);

  return {
    _id: session.userId,
    email: session.email,
    isFirstTimeLogin: session.isFirstTimeLogin
  };
};