
import jwt from "jsonwebtoken"
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { getUserModel } from "../../global/users/models/user.model.js";


export const generateMFA = async (userId, email) => {
  const User = getUserModel();

  const user = await User.findById(userId);

  const secret = speakeasy.generateSecret({
    name: `MyApp (${email})`,
  });

  // ⚠️ TEMP storage (important)
  user.mfaTempSecret = secret.base32;

  const payload = {
    userId: userId,
    "type":"mfa"
  };


  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "3m",
  });




  await user.save();

  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  return {
    qrCode,
    token
  };
};