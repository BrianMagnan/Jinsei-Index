// Vercel serverless function for challenge routes
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "../../backend/src/config/database.js";
import { authenticate } from "../../backend/src/middleware/auth.js";
import challengeRoutes from "../../backend/src/routes/challenges.js";

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

    // Mount challenge routes at /api/challenges
    app.use("/api/challenges", authenticate, challengeRoutes);

    return app(req, res);
  } catch (error) {
    console.error("Challenges handler error:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: error.message || "Internal server error",
      });
    }
  }
}

