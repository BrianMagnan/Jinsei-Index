import express from "express";
import {
  getSubSkills,
  getSubSkill,
  createSubSkill,
  updateSubSkill,
  deleteSubSkill,
} from "../controllers/subSkillController.js";

const router = express.Router();

router.get("/", getSubSkills);
router.get("/:id", getSubSkill);
router.post("/", createSubSkill);
router.put("/:id", updateSubSkill);
router.delete("/:id", deleteSubSkill);

export default router;
