import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
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
    // Category leveling will be calculated based on XP
    // We'll implement the formula later
  },
  {
    timestamps: true,
  }
);

// Calculate level based on XP (to be refined later)
categorySchema.methods.calculateLevel = function () {
  // Placeholder: categories level slower than skills
  // For now, using a simple formula - can adjust later
  // Example: slower progression than skills (100 XP/level)
  const baseXPPerLevel = 200; // Categories level slower
  const calculatedLevel = Math.floor(this.xp / baseXPPerLevel) + 1;
  this.level = Math.max(1, calculatedLevel);
  return this.level;
};

// Add XP and update level
categorySchema.methods.addXP = function (amount) {
  this.xp += amount;
  this.calculateLevel();
  return this.save();
};

export default mongoose.model("Category", categorySchema);
