// Vercel serverless function for profile routes
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "../../backend/src/config/database.js";
import { authenticate } from "../../backend/src/middleware/auth.js";
import profileRoutes from "../../backend/src/routes/profiles.js";

dotenv.config();

let dbConnected = false;

const connectDBOnce = async () => {
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
    } catch (error) {
      console.error("Database connection error:", error);
      throw error;
    }
  }
};

export default async function handler(req, res) {
  try {
    await connectDBOnce();

    const app = express();

    app.use(
      cors({
        origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
        credentials: true,
      })
    );
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Mount profile routes at /api/profiles (with authentication)
    app.use("/api/profiles", authenticate, profileRoutes);

    return app(req, res);
  } catch (error) {
    console.error("Profiles handler error:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: error.message || "Internal server error",
      });
    }
  }
}

