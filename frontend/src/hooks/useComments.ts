import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export interface Comment {
  _id: string;
  courseId: string;
  lessonId?: string;
  studentId: string;
  studentName: string;
  text: string;
  createdAt: string;
}

export function useComments(courseId: string, lessonId?: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    try {
      const params = lessonId ? `?lessonId=${lessonId}` : "";
      const res = await axios.get(`${API}/courses/${courseId}/comments${params}`);
      setComments(res.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const addComment = async (text: string) => {
    const body: any = { text };
    if (lessonId) body.lessonId = lessonId;
    const res = await axios.post(`${API}/courses/${courseId}/comments`, body);
    setComments((prev) => [res.data, ...prev]);
  };

  const deleteComment = async (commentId: string) => {
    await axios.delete(`${API}/courses/${courseId}/comments/${commentId}`);
    setComments((prev) => prev.filter((c) => c._id !== commentId));
  };

  return { comments, loading, addComment, deleteComment };
}