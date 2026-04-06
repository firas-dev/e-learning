import express from "express";
import mongoose from "mongoose";
import UserPreferences from "../models/UserPreferences";

const router = express.Router();

// GET preferences
router.get("/:userId", async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.userId);

    const prefs = await UserPreferences.findOne({ userId });

    res.json(prefs);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE or UPDATE preferences
router.post("/", async (req, res) => {
  try {
    const { userId, ...data } = req.body;

    const objectId = new mongoose.Types.ObjectId(userId);

    const prefs = await UserPreferences.findOneAndUpdate(
      { userId: objectId },
      { userId: objectId, ...data },
      { new: true, upsert: true }
    );

    res.json(prefs);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

export default router;