import winston from "winston";

const isProd = process.env.NODE_ENV === "production";

const logger = winston.createLogger({
  level: isProd ? "info" : "debug",

  format: winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
  return ` [${level.toUpperCase()}]: ${stack || message} ${
    Object.keys(meta).length ? JSON.stringify(meta) : ""
  }`;
}),

  transports: [
    new winston.transports.Console(),
  ],
});

export default logger;