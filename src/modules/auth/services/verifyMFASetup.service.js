import speakeasy from "speakeasy";
import { getUserModel } from "../../global/users/models/user.model.js";

import { getRedis } from "../../../config/redis/redis.js";

export const verifyMFASetupService = async (userId, token) => {
  try {
  const User = getUserModel();
   const redis = getRedis();
  // const user = await User.findById(userId);

  // if (!user) throw new Error("User not found");

  // ✅ Get temp secret from Redis
  const data = await redis.get(`mfa:setup:${userId}`);
  if (!data) throw new Error("Setup expired. Try again.");
  
    const { tempSecret } = JSON.parse(data);


const verified = speakeasy.totp.verify({
  secret: tempSecret,
  encoding: "base32",
  token,
  window: 1, // allows ±30s
});

  if (!verified) throw new Error("Invalid OTP");

// ✅ Single DB write (no read)
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          mfaSecret: tempSecret,
          mfaEnabled: true,
          isFirstTimeLogin: false,
        },
        $unset: {
          mfaTempSecret: "",
        },
      }
    );


  await redis.del(`mfa:setup:${userId}`);

  return true;
  } catch (error) {
    throw error;
  }
 
};