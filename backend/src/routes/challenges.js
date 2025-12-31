import express from "express";
import {
  getChallenges,
  getChallenge,
  createChallenge,
  updateChallenge,
  deleteChallenge,
} from "../controllers/challengeController.js";

const router = express.Router();

router.get("/", getChallenges);
router.get("/:id", getChallenge);
router.post("/", createChallenge);
router.put("/:id", updateChallenge);
router.delete("/:id", deleteChallenge);

export default router;
