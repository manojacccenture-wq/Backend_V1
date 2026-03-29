export const setAuthCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd, // true in production (HTTPS)
    sameSite: isProd ? "none" : "lax", // required for cross-site in prod
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
};

export const clearAuthCookie = (res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
};