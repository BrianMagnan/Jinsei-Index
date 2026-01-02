// Vercel serverless function that handles all API routes
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "../backend/src/config/database.js";
import routes from "../backend/src/routes/index.js";

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes - mount at /api since Vercel routes /api/* to this function
app.use("/api", routes);

// Export as serverless function
export default async function handler(req, res) {
  // Connect to MongoDB (connection is cached by connectDB)
  await connectDB();
  return app(req, res);
}

