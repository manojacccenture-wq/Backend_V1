const isProd = process.env.NODE_ENV === "production";

export const errorMiddleware = (err, req, res, next) => {
  console.error("❌ ERROR:", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // 🔥 Normalize common errors
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Access token expired";
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  }

  // 🔒 PROD safe response
  if (isProd && statusCode === 500) {
    message = "Internal server error";
  }

  return res.status(statusCode).json({
    success: false,
    message,
    ...(isProd ? {} : { stack: err.stack }),
  });
};