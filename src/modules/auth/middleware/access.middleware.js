import jwt from  "jsonwebtoken"


export const accessAuthMiddleware = (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ msg: "No access token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== "access") {
      return res.status(403).json({ msg: "Invalid access token" });
    }

    req.user = decoded;

    next();
  } catch(error) {

    
    return res.status(401).json({ msg: "Invalid access token" });
  }
};