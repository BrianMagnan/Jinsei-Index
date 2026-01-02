import mongoose from "mongoose";
import Challenge from "./Challenge.js";
import Skill from "./Skill.js";
import Category from "./Category.js";

const achievementSchema = new mongoose.Schema(
  {
    challenge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Challenge",
      required: true,
    },
    profile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// When an achievement is created, award XP to the skill and category
achievementSchema.post("save", async function () {
  try {
    // Manually fetch the full hierarchy
    const challenge = await Challenge.findById(this.challenge).populate(
      "skill"
    );
    if (!challenge) {
      console.error("Challenge not found for achievement");
      return;
    }

    const skill = await Skill.findById(challenge.skill);
    if (!skill) {
      console.error("Skill not found for challenge");
      return;
    }

    const category = await Category.findById(skill.category);
    if (!category) {
      console.error("Category not found for skill");
      return;
    }

    const xpReward = challenge.xpReward;

    // Award XP to both skill and category
    await skill.addXP(xpReward);
    await category.addXP(xpReward);
  } catch (error) {
    console.error("Error awarding XP after achievement creation:", error);
  }
});

export default mongoose.model("Achievement", achievementSchema);
