import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema(
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
    subSkill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubSkill",
      required: true,
    },
    xpReward: {
      type: Number,
      required: true,
      min: 1,
      default: 10,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Challenge", challengeSchema);
