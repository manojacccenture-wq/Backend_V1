import argon2 from "argon2";

//  Hash password
export const hashPassword = async (plainPassword) => {
  return await argon2.hash(plainPassword, {
    type: argon2.argon2id, //  important
    memoryCost: 2 ** 16,   // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
};

//  Verify password
export const verifyPassword = async (hashedPassword, plainPassword) => {
  return await argon2.verify(hashedPassword, plainPassword);
};