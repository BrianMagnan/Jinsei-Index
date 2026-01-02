import express from "express";
import {
  getChallenges,
  getChallenge,
  createChallenge,
  updateChallenge,
  deleteChallenge,
} from "../controllers/challengeController.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// All challenge routes require authentication
router.use(authenticate);

router.get("/", getChallenges);
router.get("/:id", getChallenge);
router.post("/", createChallenge);
router.put("/:id", updateChallenge);
router.delete("/:id", deleteChallenge);

export default router;
