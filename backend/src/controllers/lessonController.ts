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
  
      // ✅ Handle case where no files are uploaded
      const uploadedFiles = req.files as any[];
      const files = uploadedFiles && uploadedFiles.length > 0
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
      // Auto-update course duration from uploaded video files
      const videoDurationSeconds = uploadedFiles && uploadedFiles.length > 0
      ? uploadedFiles
          .filter((f) => f.mimetype?.startsWith('video/'))
          .reduce((sum: number, f: any) => sum + (f.duration || 0), 0)
      : 0;

      if (videoDurationSeconds > 0) {
      const addedHours = videoDurationSeconds / 60;
      await Course.findByIdAndUpdate(courseId, { $inc: { duration: addedHours } });
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
    // Subtract video durations from course total
    const videoFiles = lesson.files.filter((f) => f.mimetype?.startsWith('video/'));
    if (videoFiles.length > 0) {
      try {
        const durations = await Promise.all(
          videoFiles.map((f) =>
            cloudinary.api.resource(f.publicId, { resource_type: 'video' })
              .then((info: any) => info.duration || 0)
              .catch(() => 0)
          )
        );
        const removedHours = durations.reduce((s: number, d: number) => s + d, 0) / 3600;
        if (removedHours > 0) {
          await Course.findByIdAndUpdate(lesson.courseId, { $inc: { duration: -removedHours } });
        }
      } catch (_) {}
    }
    // Delete each file from Cloudinary
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
    const newFiles = (req.files as any[]).map((f) => ({
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
      // Auto-update course duration from newly uploaded video files
      const uploadedFiles = req.files as any[];
      const videoDurationSeconds = uploadedFiles
        .filter((f) => f.mimetype?.startsWith('video/'))
        .reduce((sum: number, f: any) => sum + (f.duration || 0), 0);

      if (videoDurationSeconds > 0) {
        const lesson = await Lesson.findById(lessonId);
        if (lesson) {
          const addedHours = videoDurationSeconds / 60;
          await Course.findByIdAndUpdate(lesson.courseId, { $inc: { duration: addedHours } });
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
    // Subtract video duration from course duration
      const lesson = await Lesson.findById(lessonId);
      if (lesson && mimetype?.startsWith('video/')) {
        const file = lesson.files.find((f) => f.publicId === publicId);
        if (file) {
          // Get duration from Cloudinary
          try {
            const info = await cloudinary.api.resource(publicId, { resource_type: 'video' });
            const removedHours = (info.duration || 0) / 3600;
            if (removedHours > 0) {
              await Course.findByIdAndUpdate(lesson.courseId, { $inc: { duration: -removedHours } });
            }
          } catch (_) {}
        }
      }
    res.json({ message: "File deleted." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};