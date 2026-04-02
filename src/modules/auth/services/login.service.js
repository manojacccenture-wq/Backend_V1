import { getUserModel } from "../../global/users/models/user.model.js";
import { verifyPassword } from "../../../shared/services/hashPassword/hash.service.js";
import { generateEmailOtp } from "./otp.service.js";
import { generateTempToken } from "../authUtils/token.utils.js";
import { getRedis } from "../../../config/redis/redis.js";

export const loginService = async (email, password) => {
  const User = getUserModel();

  const redis = getRedis();


  //  check if session already exists
  const existingSessionKey = `auth:email:${email}`;
  const existingSession = await redis.get(existingSessionKey);
  



  if (existingSession) {
    const session = JSON.parse(existingSession);

    return {
      emailOtpRequired: !session.mfaEnabled,
      mfaRequired: session.mfaEnabled,
      token: generateTempToken(session.userId, session.tenantId, session.mfaEnabled ? "mfa" : "email_otp"),
    };
  }


  //  only hit DB if no session
  const user = await User.findOne({ email }).select(
    "_id password tenantId email mfaEnabled mfaSecret isFirstTimeLogin"
  );


  if (!user) throw new Error("Invalid email");

  const isMatch = await verifyPassword(user.password, password);
  if (!isMatch) throw new Error("Invalid password");

  // =========================
  // MFA FLOW
  // =========================
  
  if (user.mfaEnabled) {
    const token = generateTempToken(user._id, user.tenantId, "mfa");
    
    
    await redis.setEx(
      `auth:session:${user._id}`,
      300,
      JSON.stringify({
        userId: user._id,
        tenantId: user.tenantId,
        email: user.email,
        mfaSecret: user.mfaSecret,
        isFirstTimeLogin: user.isFirstTimeLogin,
        type: user.mfaEnabled ? "mfa" : "email_otp" // 🔥 ADD THIS
      })
    );
    await redis.setEx(
      `auth:email:${user.email}`,
      300,
      JSON.stringify({
        userId: user._id,
        tenantId: user.tenantId,
        mfaEnabled: user.mfaEnabled,
      })
    );

    return {
      mfaRequired: true,
      token,
    };
  }

  else {

    // =========================
    // EMAIL OTP FLOW
    // =========================
    const otp = await generateEmailOtp(user);


    await redis.setEx(
      `auth:session:${user._id}`,
      300,
      JSON.stringify({
        userId: user._id,
        tenantId: user.tenantId,
        email: user.email,
        isFirstTimeLogin: user.isFirstTimeLogin,
        type: user.mfaEnabled ? "mfa" : "email_otp" // 🔥 ADD THIS
      })
    );

    const token = generateTempToken(user._id, user.tenantId, "email_otp");

    return {
      emailOtpRequired: true,
      token,
    };
  }
};