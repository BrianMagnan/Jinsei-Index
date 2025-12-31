import SubSkill from "../models/SubSkill.js";
import Challenge from "../models/Challenge.js";

// Get all subSkills (optionally filtered by skill)
export const getSubSkills = async (req, res) => {
  try {
    const query = req.query.skill ? { skill: req.query.skill } : {};
    const subSkills = await SubSkill.find(query)
      .populate("skill")
      .sort({ name: 1 });

    // Manually populate challenges for each subSkill
    const subSkillsWithChallenges = await Promise.all(
      subSkills.map(async (subSkill) => {
        const challenges = await Challenge.find({ subSkill: subSkill._id });
        return {
          ...subSkill.toObject(),
          challenges,
        };
      })
    );

    res.json(subSkillsWithChallenges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single subSkill by ID
export const getSubSkill = async (req, res) => {
  try {
    const subSkill = await SubSkill.findById(req.params.id).populate({
      path: "skill",
      populate: "category",
    });

    if (!subSkill) {
      return res.status(404).json({ error: "SubSkill not found" });
    }

    const challenges = await Challenge.find({ subSkill: subSkill._id });
    const subSkillWithChallenges = {
      ...subSkill.toObject(),
      challenges,
    };

    res.json(subSkillWithChallenges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create subSkill
export const createSubSkill = async (req, res) => {
  try {
    const { name, description, skill } = req.body;

    if (!name || !skill) {
      return res.status(400).json({ error: "Name and skill are required" });
    }

    const subSkill = new SubSkill({ name, description, skill });
    await subSkill.save();
    await subSkill.populate("skill");
    res.status(201).json(subSkill);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update subSkill
export const updateSubSkill = async (req, res) => {
  try {
    const { name, description, skill } = req.body;
    const subSkill = await SubSkill.findByIdAndUpdate(
      req.params.id,
      { name, description, skill },
      { new: true, runValidators: true }
    ).populate("skill");

    if (!subSkill) {
      return res.status(404).json({ error: "SubSkill not found" });
    }

    res.json(subSkill);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete subSkill
export const deleteSubSkill = async (req, res) => {
  try {
    const subSkill = await SubSkill.findById(req.params.id);

    if (!subSkill) {
      return res.status(404).json({ error: "SubSkill not found" });
    }

    // Delete associated challenges
    await Challenge.deleteMany({ subSkill: subSkill._id });
    await subSkill.deleteOne();
    res.json({ message: "SubSkill deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
