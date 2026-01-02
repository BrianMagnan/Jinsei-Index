import Challenge from "../models/Challenge.js";

// Get all challenges (optionally filtered by skill)
export const getChallenges = async (req, res) => {
  try {
    const query = req.query.skill ? { skill: req.query.skill } : {};
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
    const challenge = await Challenge.findById(req.params.id).populate({
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
    const { name, description, skill, xpReward } = req.body;

    if (!name || !skill) {
      return res.status(400).json({ error: "Name and skill are required" });
    }

    const challenge = new Challenge({
      name,
      description,
      skill,
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
    const challenge = await Challenge.findByIdAndUpdate(
      req.params.id,
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
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    await challenge.deleteOne();
    res.json({ message: "Challenge deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
