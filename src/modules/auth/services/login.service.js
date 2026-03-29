import { getUserModel } from "../../global/users/models/user.model.js";
import { verifyPassword } from "../../../shared/services/hashPassword/hash.service.js";
import { generateEmailOtp } from "./otp.service.js";
import { generateTempToken } from "../utils/token.utils.js";

export const loginService = async (email, password) => {
  const User = getUserModel();
  const user = await User.findOne({ email });

  if (!user) throw new Error("Invalid email");

  const isMatch = await verifyPassword(user.password, password);
  if (!isMatch) throw new Error("Invalid password");

  //  MFA
  if (user.mfaEnabled) {
    return {
      mfaRequired: true,
      token: generateTempToken(user._id, "mfa"),
    };
  }

  //  EMAIL OTP
  await generateEmailOtp(user);

  return {
    emailOtpRequired: true,
    token: generateTempToken(user._id, "email_otp"),
  };
};