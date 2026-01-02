import express from "express";
import categoryRoutes from "./categories.js";
import skillRoutes from "./skills.js";
import challengeRoutes from "./challenges.js";
import achievementRoutes from "./achievements.js";
import profileRoutes from "./profiles.js";
import authRoutes from "./auth.js";

const router = express.Router();

// Health check route
router.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Mount route modules
router.use("/auth", authRoutes);
router.use("/categories", categoryRoutes);
router.use("/skills", skillRoutes);
router.use("/challenges", challengeRoutes);
router.use("/achievements", achievementRoutes);
router.use("/profiles", profileRoutes);

export default router;
