import mongoose from "mongoose";

const savedProjectSchema = new mongoose.Schema(
  {
    savedProjectID: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => new mongoose.Types.ObjectId().toHexString(),
    },
    userID: {
      type: Number,
      required: true,
      index: true,
    },
    projectID: {
      type: Number,
      required: true,
      index: true,
    },
    folder: {
      type: String,
      trim: true,
      default: "default",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    savedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
  },
);

savedProjectSchema.index({ userID: 1, projectID: 1 }, { unique: true });
savedProjectSchema.index({ createdAt: -1 });

const SavedProject =
  mongoose.models.SavedProject ||
  mongoose.model("SavedProject", savedProjectSchema);

export default SavedProject;
