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
  parentId?: string;
  replies?: Comment[]; // important for nested UI
}

export function useComments(courseId: string, lessonId?: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Helper: build tree (flat → nested replies) ────────────────────────
  const buildTree = (flatComments: Comment[]): Comment[] => {
    const map = new Map<string, Comment>();
    const roots: Comment[] = [];

    // Initialize map
    flatComments.forEach((c) => {
      map.set(c._id, { ...c, replies: [] });
    });

    // Build hierarchy
    flatComments.forEach((c) => {
      if (c.parentId) {
        const parent = map.get(c.parentId);
        if (parent) {
          parent.replies!.push(map.get(c._id)!);
        }
      } else {
        roots.push(map.get(c._id)!);
      }
    });

    return roots;
  };

  // ── Fetch comments ────────────────────────────────────────────────────
  const fetchComments = useCallback(async () => {
    if (!courseId) return;

    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (lessonId && lessonId.trim() !== "") {
        params.lessonId = lessonId;
      }

      const res = await axios.get(
        `${API}/courses/${courseId}/comments`,
        { params }
      );

      // Convert flat list → nested tree
      const structured = buildTree(res.data);
      setComments(structured);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // ── Add top-level comment ─────────────────────────────────────────────
  const addComment = async (text: string) => {
    const body: Record<string, string> = { text };

    if (lessonId && lessonId.trim() !== "") {
      body.lessonId = lessonId;
    }

    const res = await axios.post(
      `${API}/courses/${courseId}/comments`,
      body
    );

    await fetchComments(); // keep structure correct
    return res.data;
  };

  // ── Add reply ─────────────────────────────────────────────────────────
  const addReply = async (parentId: string, text: string) => {
    const body: Record<string, string> = {
      text,
      parentId,
    };

    if (lessonId && lessonId.trim() !== "") {
      body.lessonId = lessonId;
    }

    const res = await axios.post(
      `${API}/courses/${courseId}/comments`,
      body
    );

    await fetchComments(); // safest way to sync replies
    return res.data;
  };

  // ── Delete comment (and replies if backend handles it) ────────────────
  const deleteComment = async (commentId: string) => {
    await axios.delete(
      `${API}/courses/${courseId}/comments/${commentId}`
    );

    await fetchComments(); // ensure UI stays consistent
  };

  return {
    comments,
    loading,
    addComment,
    addReply, 
    deleteComment,
    refetch: fetchComments,
  };
}