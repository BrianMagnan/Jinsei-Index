import mongoose from "mongoose";

const subSkillSchema = new mongoose.Schema(
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
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Skill",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// SubSkills are organizational only - no XP or level tracking

export default mongoose.model("SubSkill", subSkillSchema);
