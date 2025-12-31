import express from "express";
import categoryRoutes from "./categories.js";
import skillRoutes from "./skills.js";
import subSkillRoutes from "./subSkills.js";
import challengeRoutes from "./challenges.js";
import achievementRoutes from "./achievements.js";

const router = express.Router();

// Health check route
router.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Mount route modules
router.use("/categories", categoryRoutes);
router.use("/skills", skillRoutes);
router.use("/subskills", subSkillRoutes);
router.use("/challenges", challengeRoutes);
router.use("/achievements", achievementRoutes);

export default router;
