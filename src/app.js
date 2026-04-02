import cors from "cors"
import express from "express";
import cookieParser from "cookie-parser";
import routesIndex from "./routes/v1/index.js"
import { errorMiddleware } from "./shared/middleware/errorHanlder/error.middleware.js"
const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://mmsaas.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, mobile apps, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// Middleware

app.use(express.json());
app.use(cookieParser());

app.use("/v1", routesIndex)
app.use(errorMiddleware);



export default app;