import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export interface LessonFile {
  originalName: string;
  publicId: string;
  url: string;
  mimetype: string;
  size: number;
}

export interface Lesson {
  _id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  files: LessonFile[];
}

export function useLessons(courseId: string) {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
  
    const fetchLessons = async () => {
      if (!courseId) {
        console.error("❌ courseId is missing!");
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API}/courses/${courseId}/lessons`);
        setLessons(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load lessons.");
      } finally {
        setLoading(false);
      }
    };
  
    const createLesson = async (
        title: string,
        description: string,
        order: number,
        files: File[]
      ) => {      
        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("order", String(order));
        
        // ✅ Only append files if there are any
        if (files.length > 0) {
          files.forEach((f) => formData.append("files", f));
        }
      
        try {
          const res = await axios.post(
            `${API}/courses/${courseId}/lessons`,
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          setLessons((prev) => [...prev, res.data]);
          return res.data;
        } catch (err: any) {
          console.error("❌ createLesson error:", err.response?.data || err.message);
          throw err;
        }
      };
  
    const deleteLesson = async (lessonId: string) => {
      await axios.delete(`${API}/courses/lessons/${lessonId}`);
      setLessons((prev) => prev.filter((l) => l._id !== lessonId));
    };
  
    const addFiles = async (lessonId: string, files: File[]) => {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const res = await axios.post(
        `${API}/courses/lessons/${lessonId}/files`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setLessons((prev) =>
        prev.map((l) => (l._id === lessonId ? res.data : l))
      );
    };
  
    const deleteFile = async (lessonId: string, publicId: string, mimetype: string) => {
      await axios.delete(`${API}/courses/lessons/${lessonId}/files`, {
        data: { publicId, mimetype },
      });
      setLessons((prev) =>
        prev.map((l) =>
          l._id === lessonId
            ? { ...l, files: l.files.filter((f) => f.publicId !== publicId) }
            : l
        )
      );
    };
  
    useEffect(() => {
      if (courseId) fetchLessons();
    }, [courseId]);
  
    return { lessons, loading, error, createLesson, deleteLesson, addFiles, deleteFile };
  }