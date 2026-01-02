import Challenge from "../models/Challenge.js";
import Skill from "../models/Skill.js";

// Get all challenges (optionally filtered by skill) for the authenticated profile
export const getChallenges = async (req, res) => {
  try {
    if (!req.profileId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const query = { profile: req.profileId };
    if (req.query.skill) {
      query.skill = req.query.skill;
    }
    const challenges = await Challenge.find(query)
      .populate({
        path: "skill",
        populate: "category",
      })
      .sort({ name: 1 });
    res.json(challenges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single challenge by ID
export const getChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ _id: req.params.id, profile: req.profileId }).populate({
      path: "skill",
      populate: "category",
    });

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    res.json(challenge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create challenge
export const createChallenge = async (req, res) => {
  try {
    if (!req.profileId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const { name, description, skill, xpReward } = req.body;

    if (!name || !skill) {
      return res.status(400).json({ error: "Name and skill are required" });
    }

    // Verify skill belongs to this profile
    const skillDoc = await Skill.findOne({ _id: skill, profile: req.profileId });
    if (!skillDoc) {
      return res.status(404).json({ error: "Skill not found" });
    }

    const challenge = new Challenge({
      name,
      description,
      skill,
      profile: req.profileId,
      xpReward: xpReward || 10,
    });
    await challenge.save();
    await challenge.populate({
      path: "skill",
      populate: "category",
    });
    res.status(201).json(challenge);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update challenge
export const updateChallenge = async (req, res) => {
  try {
    const { name, description, skill, xpReward } = req.body;
    
    // If skill is being updated, verify it belongs to this profile
    if (skill) {
      const skillDoc = await Skill.findOne({ _id: skill, profile: req.profileId });
      if (!skillDoc) {
        return res.status(404).json({ error: "Skill not found" });
      }
    }

    const challenge = await Challenge.findOneAndUpdate(
      { _id: req.params.id, profile: req.profileId },
      { name, description, skill, xpReward },
      { new: true, runValidators: true }
    ).populate({
      path: "skill",
      populate: "category",
    });

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    res.json(challenge);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete challenge
export const deleteChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findOne({ _id: req.params.id, profile: req.profileId });

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    await challenge.deleteOne();
    res.json({ message: "Challenge deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
