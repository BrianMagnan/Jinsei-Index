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

// Simple CORS configuration - allow all origins for now
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Health check endpoints - after CORS
app.get("/health", (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[HEALTH CHECK] GET /health at ${timestamp}`);
  console.log(`[HEALTH CHECK] Server ready: ${serverReady}`);
  
  if (!serverReady) {
    console.log(`[HEALTH CHECK] ⚠️  Server not ready yet, returning 503`);
    return res.status(503).json({ status: "NOT_READY", message: "Server is starting up" });
  }
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  const response = { 
    status: "OK", 
    message: "Server is running", 
    timestamp: timestamp,
    ready: serverReady
  };
  console.log(`[HEALTH CHECK] ✅ Sending 200 OK response`);
  res.status(200).json(response);
});

app.get("/", (req, res) => {
  console.log(`[ROOT CHECK] GET / - ${new Date().toISOString()}`);
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ status: "OK", message: "Jinsei Index API", timestamp: new Date().toISOString() });
});

// Log all requests for debugging (skip health checks to reduce noise)
app.use((req, res, next) => {
  if (req.path !== '/health' && req.path !== '/') {
    console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  }
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", routes);

// Track if server is fully ready
let serverReady = false;

// Start server first - bind to 0.0.0.0 to accept connections from Railway
// Use the PORT that Railway provides (or default to 3000)
const server = app.listen(PORT, '0.0.0.0', () => {
  const address = server.address();
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`✅ Server address: ${JSON.stringify(address)}`);
  console.log(`✅ CORS enabled for all origins`);
  console.log(`✅ Server listening on 0.0.0.0:${PORT}`);
  console.log(`✅ Health check available at http://0.0.0.0:${PORT}/health`);
  console.log(`✅ Root endpoint available at http://0.0.0.0:${PORT}/`);
  
  // Mark server as ready immediately when listening
  serverReady = true;
  console.log(`✅ Server marked as ready at ${new Date().toISOString()}`);
  console.log(`✅ Ready to accept connections`);
  console.log(`✅ Railway PORT env var: ${process.env.PORT || 'not set (using default 3000)'}`);
  
  // Test that server actually responds
  console.log(`✅ Server is listening and ready for requests`);
  
  // Connect to MongoDB after server starts (non-blocking)
  // Don't wait for MongoDB - server should be ready even if DB isn't connected
  connectDB().catch((error) => {
    console.error("❌ Failed to connect to MongoDB:", error);
    console.error("⚠️  Server will continue running, but database operations will fail");
  });
});

// Ensure server stays alive - handle any errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  // Don't exit - try to keep running
});

// Log when server closes (shouldn't happen unless Railway sends SIGTERM)
server.on('close', () => {
  console.log('⚠️  Server closed - this should only happen on shutdown');
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

// Keep the process alive - prevent accidental exits
// Railway needs the process to stay in the foreground
setInterval(() => {
  if (serverReady) {
    console.log(`💓 Heartbeat: Server still alive at ${new Date().toISOString()}`);
  }
}, 30000);

// Prevent the process from exiting unexpectedly
process.on('beforeExit', (code) => {
  console.log(`⚠️  Process beforeExit with code: ${code}`);
  console.log(`⚠️  This should not happen - process should stay alive`);
  // Don't exit - keep the process running
  // Railway might be checking if the process exits
});

// Log that we're staying alive
console.log('🔵 Process started, will stay alive');
console.log(`🔵 Process PID: ${process.pid}`);
console.log(`🔵 Process uptime: ${process.uptime()}s`);
