import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/database.js";
import routes from "./routes/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map(origin => origin.trim()) || ["http://localhost:8080"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Check for Vercel preview URLs (wildcard support)
      if (origin.includes('.vercel.app')) {
        return callback(null, true);
      }
      
      // Reject other origins
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Routes
app.use("/api", routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
