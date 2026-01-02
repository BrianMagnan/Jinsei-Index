import { login } from "../../backend/src/controllers/authController.js";
import { connectDB } from "../../backend/src/config/database.js";

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
    // If body is already parsed, return it
    if (typeof req.body === "object") {
      return req.body;
    }
    // If body is a string, parse it
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
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Parse request body
    req.body = await parseBody(req);

    // Connect to database
    await connectDBOnce();

    // Call the controller
    await login(req, res);
  } catch (error) {
    console.error("Login error:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        error: error.message || "Internal server error",
      });
    }
  }
}
