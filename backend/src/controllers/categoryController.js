import Category from "../models/Category.js";
import Skill from "../models/Skill.js";
import Challenge from "../models/Challenge.js";

// Get all categories for the authenticated profile
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ profile: req.profileId }).sort({
      name: 1,
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single category by ID with full hierarchy
export const getCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      profile: req.profileId,
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Manually populate skills with challenges (only for this profile)
    const skills = await Skill.find({
      category: category._id,
      profile: req.profileId,
    });
    const skillsWithChallenges = await Promise.all(
      skills.map(async (skill) => {
        const challenges = await Challenge.find({
          skill: skill._id,
          profile: req.profileId,
        });
        return {
          ...skill.toObject(),
          challenges,
        };
      })
    );

    const categoryWithHierarchy = {
      ...category.toObject(),
      skills: skillsWithChallenges,
    };

    res.json(categoryWithHierarchy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create category
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const category = new Category({
      name,
      description,
      profile: req.profileId,
    });
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, profile: req.profileId },
      { name, description },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      profile: req.profileId,
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Delete associated skills and challenges
    const skills = await Skill.find({
      category: category._id,
      profile: req.profileId,
    });
    for (const skill of skills) {
      await Challenge.deleteMany({ skill: skill._id, profile: req.profileId });
    }
    await Skill.deleteMany({ category: category._id, profile: req.profileId });

    await category.deleteOne();
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
