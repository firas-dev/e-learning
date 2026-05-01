import { Request, Response } from "express";
import Lesson from "../models/Lesson";
import Course from "../models/Course";
import cloudinary from "../config/cloudinary";

// GET all lessons for a course
export const getLessons = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const lessons = await Lesson.find({ courseId }).sort({ order: 1 });
    res.json(lessons);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ─── Helper: fetch duration in seconds for one publicId, with one retry ───
async function getVideoDurationSeconds(publicId: string): Promise<number> {
  const attempt = async () => {
    const info = await cloudinary.api.resource(publicId, {
      resource_type: "video",
      image_metadata: true,
    });
    return (info.duration as number) || 0;
  };

  try {
    const seconds = await attempt();
    if (seconds > 0) return seconds;
    // If duration is still 0, wait 2s and retry once
    await new Promise((r) => setTimeout(r, 2000));
    return await attempt();
  } catch (err) {
    console.error(`❌ getVideoDurationSeconds failed for [${publicId}]:`, err);
    return 0;
  }
}

// ─── Helper: total hours for a list of publicIds ───────────────────────────
async function getVideosDurationHours(publicIds: string[]): Promise<number> {
  if (publicIds.length === 0) return 0;
  const seconds = await Promise.all(publicIds.map(getVideoDurationSeconds));
  const total = seconds.reduce((sum, s) => sum + s, 0);
  console.log(`⏱ Video durations (seconds):`, seconds, `→ total hours: ${total / 3600}`);
  return total / 3600;
}

// CREATE lesson with uploaded files
export const createLesson = async (req: Request, res: Response) => {
  try {
    const courseId = req.params.courseId as string;
    const { title, description, order } = req.body;
    const teacherId = (req as any).user.id;

    if (!title) {
      return res.status(400).json({ message: "Title is required." });
    }

    const course = await Course.findOne({ _id: courseId, teacherId });
    if (!course) {
      return res.status(403).json({ message: "Course not found or unauthorized." });
    }

    const uploadedFiles = req.files as any[];
    const files =
      uploadedFiles && uploadedFiles.length > 0
        ? uploadedFiles.map((f) => ({
            originalName: f.originalname,
            publicId: f.filename,
            url: f.path,
            mimetype: f.mimetype,
            size: f.size,
          }))
        : [];

    const lesson = await Lesson.create({
      courseId,
      title,
      description,
      order: order || 0,
      files,
    });

    // Query Cloudinary for real duration of uploaded videos
    const videoPublicIds = (uploadedFiles ?? [])
      .filter((f) => f.mimetype?.startsWith("video/"))
      .map((f) => f.filename as string);

    if (videoPublicIds.length > 0) {
      const addedHours = await getVideosDurationHours(videoPublicIds);
      if (addedHours > 0) {
        await Course.findByIdAndUpdate(courseId, { $inc: { duration: addedHours } });
        console.log(`✅ Course ${courseId} duration +${addedHours}h`);
      } else {
        console.warn("⚠️ Could not get video duration from Cloudinary");
      }
    }

    res.status(201).json(lesson);
  } catch (err) {
    console.error("❌ createLesson error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE a lesson (also deletes files from Cloudinary)
export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found." });

    const videoPublicIds = lesson.files
      .filter((f) => f.mimetype?.startsWith("video/"))
      .map((f) => f.publicId);

    if (videoPublicIds.length > 0) {
      const removedHours = await getVideosDurationHours(videoPublicIds);
      if (removedHours > 0) {
        await Course.findByIdAndUpdate(lesson.courseId, {
          $inc: { duration: -removedHours },
        });
      }
    }

    await Promise.all(
      lesson.files.map((f) => {
        const resourceType = f.mimetype === "application/pdf" ? "raw" : "video";
        return cloudinary.uploader.destroy(f.publicId, { resource_type: resourceType });
      })
    );

    await Lesson.findByIdAndDelete(lessonId);
    res.json({ message: "Lesson deleted." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ADD files to existing lesson
export const addFilesToLesson = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const uploadedFiles = req.files as any[];

    const newFiles = uploadedFiles.map((f) => ({
      originalName: f.originalname,
      publicId: f.filename,
      url: f.path,
      mimetype: f.mimetype,
      size: f.size,
    }));

    const lesson = await Lesson.findByIdAndUpdate(
      lessonId,
      { $push: { files: { $each: newFiles } } },
      { new: true }
    );

    const videoPublicIds = uploadedFiles
      .filter((f) => f.mimetype?.startsWith("video/"))
      .map((f) => f.filename as string);

    if (videoPublicIds.length > 0 && lesson) {
      const addedHours = await getVideosDurationHours(videoPublicIds);
      if (addedHours > 0) {
        await Course.findByIdAndUpdate(lesson.courseId, {
          $inc: { duration: addedHours },
        });
      }
    }

    res.json(lesson);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE a single file from a lesson
export const deleteFileFromLesson = async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.params;
    const { publicId, mimetype } = req.body;

    const resourceType = mimetype === "application/pdf" ? "raw" : "video";
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

    await Lesson.findByIdAndUpdate(lessonId, {
      $pull: { files: { publicId } },
    });

    if (mimetype?.startsWith("video/")) {
      const lesson = await Lesson.findById(lessonId);
      if (lesson) {
        const removedHours = await getVideosDurationHours([publicId]);
        if (removedHours > 0) {
          await Course.findByIdAndUpdate(lesson.courseId, {
            $inc: { duration: -removedHours },
          });
        }
      }
    }

    res.json({ message: "File deleted." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};