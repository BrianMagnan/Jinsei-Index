import Achievement from "../models/Achievement.js";

// Get all achievements (optionally filtered by challenge) for the authenticated profile
export const getAchievements = async (req, res) => {
  try {
    const query = { profile: req.profileId };
    if (req.query.challenge) {
      query.challenge = req.query.challenge;
    }
    const achievements = await Achievement.find(query)
      .populate({
        path: "challenge",
        populate: {
          path: "skill",
          populate: "category",
        },
      })
      .sort({ completedAt: -1 });
    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single achievement by ID
export const getAchievement = async (req, res) => {
  try {
    const achievement = await Achievement.findOne({ _id: req.params.id, profile: req.profileId }).populate({
      path: "challenge",
      populate: {
        path: "skill",
        populate: "category",
      },
    });

    if (!achievement) {
      return res.status(404).json({ error: "Achievement not found" });
    }

    res.json(achievement);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create achievement (completing a challenge)
export const createAchievement = async (req, res) => {
  try {
    const { challenge, notes, completedAt } = req.body;

    if (!challenge) {
      return res.status(400).json({ error: "Challenge is required" });
    }

    // Verify challenge belongs to this profile
    const challengeDoc = await Challenge.findOne({ _id: challenge, profile: req.profileId });
    if (!challengeDoc) {
      return res.status(404).json({ error: "Challenge not found" });
    }

    const achievement = new Achievement({
      challenge,
      profile: req.profileId,
      notes,
      completedAt: completedAt ? new Date(completedAt) : undefined,
    });

    await achievement.save();

    // Populate to get full hierarchy for response
    await achievement.populate({
      path: "challenge",
      populate: {
        path: "skill",
        populate: "category",
      },
    });

    res.status(201).json(achievement);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update achievement
export const updateAchievement = async (req, res) => {
  try {
    const { notes, completedAt } = req.body;
    const achievement = await Achievement.findOneAndUpdate(
      { _id: req.params.id, profile: req.profileId },
      { notes, completedAt: completedAt ? new Date(completedAt) : undefined },
      { new: true, runValidators: true }
    ).populate({
      path: "challenge",
      populate: {
        path: "skill",
        populate: "category",
      },
    });

    if (!achievement) {
      return res.status(404).json({ error: "Achievement not found" });
    }

    res.json(achievement);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete achievement
export const deleteAchievement = async (req, res) => {
  try {
    const achievement = await Achievement.findOne({ _id: req.params.id, profile: req.profileId });

    if (!achievement) {
      return res.status(404).json({ error: "Achievement not found" });
    }

    // Note: Deleting an achievement should also reverse the XP that was awarded
    // For now, we'll just delete it - XP reversal can be added later if needed
    await achievement.deleteOne();
    res.json({ message: "Achievement deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
