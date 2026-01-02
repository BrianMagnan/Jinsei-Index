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
// Allow all origins for now (we'll restrict later)
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins
    callback(null, true);
  },
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

// Health check endpoints - MUST be before routes for Railway readiness checks
app.get("/health", (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ status: "OK", message: "Server is running", timestamp: new Date().toISOString() });
});

// Root endpoint for Railway health checks
app.get("/", (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ status: "OK", message: "Jinsei Index API", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api", routes);

// Start server first - bind to 0.0.0.0 to accept connections from Railway
const server = app.listen(PORT, '0.0.0.0', () => {
  const address = server.address();
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`✅ Server address: ${JSON.stringify(address)}`);
  console.log(`✅ CORS enabled for all origins`);
  console.log(`✅ Server listening on 0.0.0.0:${PORT}`);
  console.log(`✅ Ready to accept connections`);
  console.log(`✅ Health check available at http://0.0.0.0:${PORT}/health`);
  console.log(`✅ Root endpoint available at http://0.0.0.0:${PORT}/`);
  
  // Immediately test that server responds
  const http = require('http');
  const testReq = http.get(`http://localhost:${PORT}/health`, (testRes) => {
    console.log(`✅ Health check test: ${testRes.statusCode}`);
    testReq.on('error', (err) => {
      console.error(`❌ Health check test failed: ${err.message}`);
    });
  });
  
  // Connect to MongoDB after server starts (non-blocking)
  connectDB().catch((error) => {
    console.error("❌ Failed to connect to MongoDB:", error);
    console.error("⚠️  Server will continue running, but database operations will fail");
  });
});

// Log server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

// Keep process alive
process.on('beforeExit', (code) => {
  console.log(`⚠️  Process beforeExit with code: ${code}`);
});

process.on('exit', (code) => {
  console.log(`⚠️  Process exiting with code: ${code}`);
});

// Graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
  // Don't exit - keep server running
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit - keep server running
});
