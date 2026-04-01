export const setAuthCookie = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === "production";

  // res.cookie("token", token, {
  //   httpOnly: true,
  //   secure: isProd, // true in production (HTTPS)
  //   sameSite: isProd ? "none" : "lax", // required for cross-site in prod
  //   maxAge: 1000 * 60 * 15, // 15 min
  // });

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 1000 * 60 * 15, // 15 min
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
};

export const clearAuthCookie = (res) => {
  const isProd = process.env.NODE_ENV === "production";

  res.clearCookie("token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
};

export const setTempAuthCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 1000 * 60 * 5, // 5 min
  });
};


export const setMfaSetupCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("mfaSetupToken", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 5 * 60 * 1000, // 5 min
  });
};