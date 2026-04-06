import mongoose, { Schema, Document } from "mongoose";

export interface IUserPreferences extends Document {
  userId: mongoose.Types.ObjectId;
  emotionDetectionEnabled: boolean;
  cameraConsentGiven: boolean;
  dataSharingEnabled: boolean;
}

const userPreferencesSchema = new Schema<IUserPreferences>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    emotionDetectionEnabled: {
      type: Boolean,
      default: true,
    },
    cameraConsentGiven: {
      type: Boolean,
      default: false,
    },
    dataSharingEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUserPreferences>(
  "UserPreferences",
  userPreferencesSchema
);