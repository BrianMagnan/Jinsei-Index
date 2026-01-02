// Vercel serverless function that handles all API routes (except auth which has specific files)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "../backend/src/config/database.js";
import { authenticate } from "../backend/src/middleware/auth.js";
import categoryRoutes from "../backend/src/routes/categories.js";
import skillRoutes from "../backend/src/routes/skills.js";
import challengeRoutes from "../backend/src/routes/challenges.js";
import achievementRoutes from "../backend/src/routes/achievements.js";
import profileRoutes from "../backend/src/routes/profiles.js";

dotenv.config();

// Connect to MongoDB (connection is cached by connectDB)
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

// Export as serverless function
export default async function handler(req, res) {
  try {
    // Connect to MongoDB
    await connectDBOnce();

    // Create Express app for this request
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

    // Routes - mount at /api since the request URL is /api/...
    // Skip auth routes since they have their own serverless functions
    app.use("/api/categories", authenticate, categoryRoutes);
    app.use("/api/skills", authenticate, skillRoutes);
    app.use("/api/challenges", authenticate, challengeRoutes);
    app.use("/api/achievements", authenticate, achievementRoutes);
    app.use("/api/profiles", authenticate, profileRoutes);

    // Health check (no auth required)
    app.get("/api/health", (req, res) => {
      res.json({ status: "OK", message: "Server is running" });
    });

    // Handle the request
    return app(req, res);
  } catch (error) {
    console.error("Handler error:", error);
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: error.message || "Internal server error"
      });
    }
  }
}
