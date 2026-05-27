import mongoose from "mongoose";

const skillSchema = new mongoose.Schema(
  {
    skillID: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => new mongoose.Types.ObjectId().toHexString(),
    },
    skillName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 50,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    category: {
      type: String,
      required: true,
      enum: ["freelancer", "designer", "developer"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const Skill = mongoose.models.Skill || mongoose.model("Skill", skillSchema);
export default Skill;
