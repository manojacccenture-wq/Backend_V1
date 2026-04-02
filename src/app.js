import express from "express";
import cors from "cors"
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import routesIndex from "./routes/v1/index.js"
import { errorMiddleware } from "./shared/middleware/errorHanlder/error.middleware.js"
const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://mmsaas.vercel.app"
];

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 100 requests per `window`
  message: 'Too many requests, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

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


app.use(
  helmet({
    contentSecurityPolicy: false, // 🔥 important for now
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);


app.use(limiter);




// Apply the rate limiting middleware to all requests

app.use(express.json());
app.use(cookieParser());


// Middleware


app.use("/v1", routesIndex)
app.use(errorMiddleware);



export default app;















// app.use(
//   helmet({
//     contentSecurityPolicy: false, // disable if issues occur
//   })
// );