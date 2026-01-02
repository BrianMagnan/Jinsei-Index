import Skill from "../models/Skill.js";
import Challenge from "../models/Challenge.js";
import Category from "../models/Category.js";

// Get all skills (optionally filtered by category) for the authenticated profile
export const getSkills = async (req, res) => {
  try {
    const query = { profile: req.profileId };
    if (req.query.category) {
      query.category = req.query.category;
    }
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
    const skill = await Skill.findOne({ _id: req.params.id, profile: req.profileId }).populate("category");

    if (!skill) {
      return res.status(404).json({ error: "Skill not found" });
    }

    // Manually populate challenges (only for this profile)
    const challenges = await Challenge.find({ skill: skill._id, profile: req.profileId });

    const skillWithHierarchy = {
      ...skill.toObject(),
      challenges,
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

    // Verify category belongs to this profile
    const categoryDoc = await Category.findOne({ _id: category, profile: req.profileId });
    if (!categoryDoc) {
      return res.status(404).json({ error: "Category not found" });
    }

    const skill = new Skill({ name, description, category, profile: req.profileId });
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
    
    // If category is being updated, verify it belongs to this profile
    if (category) {
      const categoryDoc = await Category.findOne({ _id: category, profile: req.profileId });
      if (!categoryDoc) {
        return res.status(404).json({ error: "Category not found" });
      }
    }

    const skill = await Skill.findOneAndUpdate(
      { _id: req.params.id, profile: req.profileId },
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
    const skill = await Skill.findOne({ _id: req.params.id, profile: req.profileId });

    if (!skill) {
      return res.status(404).json({ error: "Skill not found" });
    }

    // Delete associated challenges (only for this profile)
    await Challenge.deleteMany({ skill: skill._id, profile: req.profileId });

    await skill.deleteOne();
    res.json({ message: "Skill deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
