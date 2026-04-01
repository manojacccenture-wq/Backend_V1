const isProd = process.env.NODE_ENV === "production";
console.log('isProd: ', isProd)

export const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // 🔥 Log full error always (for debugging)
  console.error("❌ ERROR:", err);

  // ✅ DEV → full details
  if (!isProd) {
    return res.status(statusCode).json({
      success: false,
      message: err.message,
      stack: err.stack,
    });
  }

  // 🔒 PROD → safe response
  return res.status(statusCode).json({
    success: false,
    message: statusCode === 500
      ? "Internal server error"
      : err.message,
  });
};