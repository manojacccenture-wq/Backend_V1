import speakeasy from "speakeasy";
import { getUserModel } from "../../global/users/models/user.model.js";
import logger from "../../../shared/services/logger/logger.js";

export const verifyMFASetupService = async (userId, token) => {
  try {
  const User = getUserModel();
  const user = await User.findById(userId);

  if (!user) throw new Error("User not found");

  const verified = speakeasy.totp({
    secret: user.mfaTempSecret,
    encoding: "base32",
    token,
  });

  if (!verified) throw new Error("Invalid OTP");

  user.mfaSecret = user.mfaTempSecret;
  user.mfaTempSecret = null;
  user.mfaEnabled = true;

  await user.save();

  return true;
  } catch (error) {
    logger.error('error: ', error)
    throw error;
  }
 
};