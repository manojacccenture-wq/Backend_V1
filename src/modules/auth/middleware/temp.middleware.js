import jwt from  "jsonwebtoken"

export const tempAuthMiddleware = (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ msg: "No temp token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!["mfa", "email_otp"].includes(decoded.type)) {
      return res.status(403).json({ msg: "Invalid temp token type" });
    }

    req.user = decoded;

    next();
  } catch(error) {
    
    return res.status(401).json({ msg: "Invalid temp token" });
  }
};