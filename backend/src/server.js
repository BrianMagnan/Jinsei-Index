import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database.js";
import routes from "./routes/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Simple CORS configuration - allow all origins for now
app.use(
  cors({
    origin: true, // Allow all origins
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
