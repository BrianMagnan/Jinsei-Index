import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Category from "./Category.js";
import Skill from "./Skill.js";

const profileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false, // Don't include password in queries by default
    },
    bio: {
      type: String,
      trim: true,
      default: "",
    },
    avatar: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
profileSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) {
    return next();
  }

  try {
    // Hash password with cost of 10
    const hashedPassword = await bcrypt.hash(this.password, 10);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
profileSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Calculate total XP from all categories and skills for this profile
profileSchema.methods.calculateTotalXP = async function () {
  try {
    const categories = await Category.find({ profile: this._id });
    const categoryXP = categories.reduce((sum, cat) => sum + (cat.xp || 0), 0);

    const skills = await Skill.find({ profile: this._id });
    const skillXP = skills.reduce((sum, skill) => sum + (skill.xp || 0), 0);

    return categoryXP + skillXP;
  } catch (error) {
    console.error("Error calculating total XP:", error);
    return 0;
  }
};

// Calculate total level based on total XP
profileSchema.methods.calculateTotalLevel = async function () {
  const totalXP = await this.calculateTotalXP();
  // Using a similar formula to skills: 100 XP per level
  const xpPerLevel = 100;
  return Math.max(1, Math.floor(totalXP / xpPerLevel) + 1);
};

export default mongoose.model("Profile", profileSchema);
