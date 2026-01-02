// Vercel serverless function for category routes
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "../../backend/src/config/database.js";
import { authenticate } from "../../backend/src/middleware/auth.js";
import categoryRoutes from "../../backend/src/routes/categories.js";

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

// Helper to parse request body for Vercel
async function parseBody(req) {
  if (req.body) {
    if (typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      return req.body;
    }
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch (e) {
        throw new Error("Invalid JSON in request body");
      }
    }
  }
  return {};
}

export default async function handler(req, res) {
  try {
    // Parse request body for POST/PUT requests
    if (
      (req.method === "POST" ||
        req.method === "PUT" ||
        req.method === "PATCH") &&
      req.body
    ) {
      req.body = await parseBody(req);
    }

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

    // Mount category routes
    // Vercel routes /api/categories/* to this function
    // The routes are already set up to handle /, /:id, etc.
    app.use("/api/categories", authenticate, categoryRoutes);

    // Handle the request
    return app(req, res);
  } catch (error) {
    console.error("Categories handler error:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: error.message || "Internal server error",
      });
    }
  }
}
