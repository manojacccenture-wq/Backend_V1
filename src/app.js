import cors from "cors"
import express from "express";
import cookieParser from "cookie-parser";
import routesIndex from "./routes/v1/index.js"
import {errorMiddleware} from "./shared/middleware/errorHanlder/error.middleware.js"
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173", // your frontend URL
    credentials: true,
  })
);

// Middleware

app.use(express.json());
app.use(cookieParser()); 

app.use("/v1",routesIndex)
app.use(errorMiddleware);



export default app;