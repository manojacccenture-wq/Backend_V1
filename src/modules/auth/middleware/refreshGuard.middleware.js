import jwt from "jsonwebtoken";

/**
 * Access Token Expiry Guard Middleware
 *
 * Sits BEFORE the refreshToken controller on POST /auth/refresh.
 *
 * Decision table:
 * ┌─────────────────────────────────┬──────────────────────────────────────────┐
 * │ Access token state              │ Action                                   │
 * ├─────────────────────────────────┼──────────────────────────────────────────┤
 * │ Valid & not expired             │ Return 200 early — skip rotation entirely │
 * │ Expired (TokenExpiredError)     │ next() — allow refresh controller to run  │
 * │ Missing cookie                  │ next() — allow refresh controller to run  │
 * │ Invalid signature / malformed   │ 401 — do NOT allow rotation               │
 * │ Wrong token type                │ 401 — do NOT allow rotation               │
 * └─────────────────────────────────┴──────────────────────────────────────────┘
 *
 * Security rationale:
 *  - "Valid" → rotation would invalidate a working token for no reason and
 *    can cause sessionId loss when two refresh calls race (duplicate dispatch).
 *  - "Expired" → legitimate need; fall through to rotation.
 *  - "Missing" → could be a first-time cookie scenario; fall through.
 *  - "Invalid sig / malformed / wrong type" → attacker or corrupted token;
 *    hard reject — never allow rotation from an untrustworthy token.
 */
export const refreshGuardMiddleware = (req, res, next) => {
  const accessToken = req.cookies.accessToken;

  // ── No access token cookie → allow refresh to handle it ──────────────────
  if (!accessToken) {
    return next();
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

    // Extra type check — defence-in-depth against token type confusion
    if (decoded?.type !== "access") {
      return res.status(401).json({ msg: "Invalid token type" });
    }

    // Access token is valid and not expired — rotation is unnecessary.
    // Return 200 so the frontend treats this as a successful refresh call
    // and continues without triggering further retry logic.
    return res.json({ msg: "Access token still valid, refresh skipped" });

  } catch (err) {
    if (err.name === "TokenExpiredError") {
      // Expected case — token has expired, proceed to rotation.
      return next();
    }

    // JsonWebTokenError, NotBeforeError, or anything else:
    // The token is untrustworthy — hard reject rather than allowing rotation.
    return res.status(401).json({ msg: "Invalid access token" });
  }
};
