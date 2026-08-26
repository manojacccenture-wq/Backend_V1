import { asyncHandler } from "../../../../shared/utils/asyncHandler/asyncHandler.js";
import { generateLaunchToken, validateLaunchToken } from "../../services/launch.service.js";

/**
 * Controller to generate a short-lived launch token for SSO.
 */
export const getLaunchToken = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const email = req.user.email;
  const tenantId = req.headers["x-tenant-id"] || null;
  const productId = req.headers["x-product-id"] || null;
  const roleId = req.headers["x-role"] || null;
  const returnUrl = req.query.returnUrl || "";

  if (!userId || !email) {
    return res.status(401).json({ error: "Invalid user session" });
  }
  
  if (!productId) {
    return res.status(400).json({ error: "x-product-id header is required" });
  }

  const payload = {
    userId,
    email,
    tenantId,
    productId,
    roleId,
    ip: req.ip,
    userAgent: req.headers["user-agent"]
  };

  const token = await generateLaunchToken(payload);

  res.status(200).json({
    token,
    expiresIn: 60
  });
});

/**
 * Controller to validate a launch token. Used strictly server-to-server.
 */
export const postValidateLaunchToken = asyncHandler(async (req, res) => {
  const apiKey = req.headers["x-internal-api-key"];
  const internalKey = process.env.INTERNAL_API_KEY;

  if (!apiKey || apiKey !== internalKey) {
    return res.status(401).json({ error: "Unauthorized access. Invalid internal API key." });
  }

  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token is required in the body." });
  }

  const payload = await validateLaunchToken(token);

  if (!payload) {
    return res.status(400).json({ error: "Token invalid, expired, or already used." });
  }

  res.status(200).json({
    isValid: true,
    identity: payload
  });
});
