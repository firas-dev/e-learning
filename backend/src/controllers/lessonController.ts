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
      const { courseId } = req.params;
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

    res.json({ message: "File deleted." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};