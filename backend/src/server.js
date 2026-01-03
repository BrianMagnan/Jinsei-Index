import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database.js";
import routes from "./routes/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - restrict to allowed origins
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // Get allowed origins from environment variable
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) || [];

      // Always allow Vercel preview URLs (for preview deployments)
      if (origin.includes(".vercel.app")) {
        return callback(null, true);
      }

      // Always allow localhost for local development
      if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // If no allowed origins configured, allow all (for development)
      if (allowedOrigins.length === 0) {
        return callback(null, true);
      }

      // Reject other origins
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Health check endpoints
app.get("/health", (req, res) => {
  if (!serverReady) {
    return res
      .status(503)
      .json({ status: "NOT_READY", message: "Server is starting up" });
  }
  res.status(200).json({ status: "OK", message: "Server is running" });
});

app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Jinsei Index API" });
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", routes);

// Track if server is fully ready
let serverReady = false;

// Start server - bind to 0.0.0.0 to accept connections from Railway
const server = app.listen(PORT, "0.0.0.0", () => {
  serverReady = true;
  console.log(`Server running on port ${PORT}`);

  // Connect to MongoDB after server starts (non-blocking)
  connectDB().catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
  });
});

server.on("error", (error) => {
  console.error("Server error:", error);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Promise Rejection:", error);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
