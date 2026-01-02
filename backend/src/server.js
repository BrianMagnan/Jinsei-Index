import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database.js";
import routes from "./routes/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Make sure we're using Railway's PORT
console.log(`Starting server on port ${PORT}`);

// CORS must be first middleware
// Allow all origins for now
app.use(cors({
  origin: '*', // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", routes);

// Health check endpoint (Railway uses this)
app.get("/health", (req, res) => {
  console.log("Health check requested");
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Root endpoint for Railway health checks
app.get("/", (req, res) => {
  res.json({ status: "OK", message: "Jinsei Index API" });
});

// Start server first
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`CORS enabled for all origins`);
  
  // Connect to MongoDB after server starts (non-blocking)
  connectDB().catch((error) => {
    console.error("Failed to connect to MongoDB:", error);
    console.error("Server will continue running, but database operations will fail");
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
