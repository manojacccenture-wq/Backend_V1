import crypto from "crypto";
import { getUserModel } from "../../global/users/models/user.model.js";
import { hashPassword } from "../../../shared/services/hashPassword/hash.service.js";

/**
 * Generates an 8-character uppercase alphanumeric string chunked like XXXX-XXXX
 */
const generateRandomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar looking characters like I, 1, O, 0
  let code = "";
  for (let i = 0; i < 8; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars[randomIndex];
    if (i === 3) code += "-";
  }
  return code;
};

/**
 * Generates 10 backup codes for a user, stores the hashes, and returns plain text.
 */
export const generateBackupCodesService = async (userId) => {
  const User = getUserModel();
  const plainCodes = [];
  const hashedCodes = [];

  for (let i = 0; i < 10; i++) {
    const plainCode = generateRandomCode();
    plainCodes.push(plainCode);
    const hashedCode = await hashPassword(plainCode);
    hashedCodes.push(hashedCode);
  }

  // Overwrite the existing array
  await User.updateOne(
    { _id: userId },
    { $set: { backupCodes: hashedCodes } }
  );

  return plainCodes;
};
