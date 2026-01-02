import express from "express";
import {
  getSkills,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
} from "../controllers/skillController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// All skill routes require authentication
router.use(authenticate);

router.get("/", getSkills);
router.get("/:id", getSkill);
router.post("/", createSkill);
router.put("/:id", updateSkill);
router.delete("/:id", deleteSkill);

export default router;
