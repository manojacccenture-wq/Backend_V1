import jwt from  "jsonwebtoken"


export const mfaSetupMiddleware = (req, res, next) => {
  try {
    const token = req.cookies.mfaSetupToken;

    if (!token) {
      return res.status(401).json({ msg: "No MFA setup token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);


    if (decoded.type !== "mfa_setup") {
      return res.status(403).json({ msg: "Invalid MFA setup token" });
    }

    req.user = decoded;

    next();
  } catch(error) {
    
    return res.status(401).json({ msg: "Invalid MFA setup token" });
  }
};