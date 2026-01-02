import mongoose from "mongoose";

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    profile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    xp: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate level based on XP (100 XP per level for skills)
skillSchema.methods.calculateLevel = function () {
  const xpPerLevel = 100;
  const calculatedLevel = Math.floor(this.xp / xpPerLevel) + 1;
  this.level = Math.max(1, calculatedLevel);
  return this.level;
};

// Add XP and update level
skillSchema.methods.addXP = function (amount) {
  this.xp += amount;
  this.calculateLevel();
  return this.save();
};

export default mongoose.model("Skill", skillSchema);
