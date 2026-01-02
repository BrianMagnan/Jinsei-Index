import express from "express";
import {
  getAchievements,
  getAchievement,
  createAchievement,
  updateAchievement,
  deleteAchievement,
} from "../controllers/achievementController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// All achievement routes require authentication
router.use(authenticate);

router.get("/", getAchievements);
router.get("/:id", getAchievement);
router.post("/", createAchievement);
router.put("/:id", updateAchievement);
router.delete("/:id", deleteAchievement);

export default router;
