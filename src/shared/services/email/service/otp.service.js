import crypto from "crypto";

export const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export const getOtpExpiry = () => {
  return Date.now() + 5 * 60 * 1000;
};