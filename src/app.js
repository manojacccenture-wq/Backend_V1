import cors from "cors"
import express from "express";
import cookieParser from "cookie-parser";
import routesIndex from "./routes/v1/index.js"
import speakeasy from 'speakeasy';
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173", // your frontend URL
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser()); 

app.use("/v1",routesIndex)


export default app;