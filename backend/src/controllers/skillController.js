import Skill from "../models/Skill.js";
import SubSkill from "../models/SubSkill.js";
import Challenge from "../models/Challenge.js";

// Get all skills (optionally filtered by category)
export const getSkills = async (req, res) => {
  try {
    const query = req.query.category ? { category: req.query.category } : {};
    const skills = await Skill.find(query)
      .populate("category")
      .sort({ name: 1 });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single skill by ID
export const getSkill = async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.id).populate("category");

    if (!skill) {
      return res.status(404).json({ error: "Skill not found" });
    }

    // Manually populate subSkills and challenges
    const subSkills = await SubSkill.find({ skill: skill._id });
    const subSkillsWithChallenges = await Promise.all(
      subSkills.map(async (subSkill) => {
        const challenges = await Challenge.find({ subSkill: subSkill._id });
        return {
          ...subSkill.toObject(),
          challenges,
        };
      })
    );

    const skillWithHierarchy = {
      ...skill.toObject(),
      subSkills: subSkillsWithChallenges,
    };

    res.json(skillWithHierarchy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create skill
export const createSkill = async (req, res) => {
  try {
    const { name, description, category } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: "Name and category are required" });
    }

    const skill = new Skill({ name, description, category });
    await skill.save();
    await skill.populate("category");
    res.status(201).json(skill);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update skill
export const updateSkill = async (req, res) => {
  try {
    const { name, description, category } = req.body;
    const skill = await Skill.findByIdAndUpdate(
      req.params.id,
      { name, description, category },
      { new: true, runValidators: true }
    ).populate("category");

    if (!skill) {
      return res.status(404).json({ error: "Skill not found" });
    }

    res.json(skill);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete skill
export const deleteSkill = async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.id);

    if (!skill) {
      return res.status(404).json({ error: "Skill not found" });
    }

    // Delete associated subSkills and challenges
    const subSkills = await SubSkill.find({ skill: skill._id });
    const subSkillIds = subSkills.map((s) => s._id);
    await Challenge.deleteMany({ subSkill: { $in: subSkillIds } });
    await SubSkill.deleteMany({ skill: skill._id });

    await skill.deleteOne();
    res.json({ message: "Skill deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
