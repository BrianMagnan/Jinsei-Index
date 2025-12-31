import Category from "../models/Category.js";
import Skill from "../models/Skill.js";
import SubSkill from "../models/SubSkill.js";
import Challenge from "../models/Challenge.js";

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get single category by ID with full hierarchy
export const getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Manually populate skills -> subSkills -> challenges
    const skills = await Skill.find({ category: category._id });
    const skillsWithSubSkills = await Promise.all(
      skills.map(async (skill) => {
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
        return {
          ...skill.toObject(),
          subSkills: subSkillsWithChallenges,
        };
      })
    );

    const categoryWithHierarchy = {
      ...category.toObject(),
      skills: skillsWithSubSkills,
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

    const category = new Category({ name, description });
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
    const category = await Category.findByIdAndUpdate(
      req.params.id,
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
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    await category.deleteOne();
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
