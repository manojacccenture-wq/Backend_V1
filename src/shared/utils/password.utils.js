import crypto from "crypto";

/**
 * Generates a secure random password that strictly meets the backend regex:
 * /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
 * 
 * Includes at least 1 uppercase, 1 lowercase, 1 number, and pads the rest.
 */
export const generateSecurePassword = (length = 12) => {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*";

  // Ensure minimum requirements
  let password = "";
  password += upper[crypto.randomInt(0, upper.length)];
  password += lower[crypto.randomInt(0, lower.length)];
  password += numbers[crypto.randomInt(0, numbers.length)];
  password += special[crypto.randomInt(0, special.length)];

  const allChars = upper + lower + numbers + special;

  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }

  // Shuffle to prevent predictable patterns
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};
