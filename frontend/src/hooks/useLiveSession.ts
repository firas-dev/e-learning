import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";

const API = "http://localhost:5000/api";
const SOCKET_URL = "http://localhost:5000";

export interface ChatMessage {
  id: string;
  user: string;
  message: string;
  time: string;
}

export interface Attachment {
  originalName: string;
  publicId: string;
  url: string;
  mimetype: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface LiveSessionData {
  _id: string;
  courseId: string;
  title: string;
  jitsiRoomId: string;
  isActive: boolean;
  attachments: Attachment[];
}

export function useLiveSession(courseId: string, userName: string) {
  const [session, setSession] = useState<LiveSessionData | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const socketRef = useRef<Socket | null>(null);

  // Fetch active session
  const fetchSession = async () => {
    try {
      const res = await axios.get(`${API}/live/${courseId}/active`);
      setSession(res.data);
      return res.data;
    } catch {
      setError("No active session found.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Start session (teacher only)
  const startSession = async (title: string) => {
    const res = await axios.post(`${API}/live/start`, { courseId, title });
    setSession(res.data);
    return res.data;
  };

  // End session (teacher only)
  const endSession = async () => {
    if (!session) return;
    await axios.patch(`${API}/live/${session._id}/end`);
    setSession(null);
  };

  // Upload attachments
  const uploadAttachments = async (files: File[], links: string[]) => {
    if (!session) return;
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    if (links.length > 0) formData.append("links", JSON.stringify(links));

    const res = await axios.post(
      `${API}/live/${session._id}/attachments`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    setSession((prev) => prev ? { ...prev, attachments: res.data.attachments } : prev);

    // Notify others via socket
    socketRef.current?.emit("attachment-added", {
      sessionId: session._id,
      attachments: res.data.attachments,
    });
  };

  // Delete attachment
  const deleteAttachment = async (publicId: string) => {
    if (!session) return;
    await axios.delete(`${API}/live/${session._id}/attachments/${publicId}`);
    setSession((prev) =>
      prev
        ? { ...prev, attachments: prev.attachments.filter((a) => a.publicId !== publicId) }
        : prev
    );
  };

  // Send chat message
  const sendMessage = (text: string) => {
    if (!session || !text.trim()) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      user: userName,
      message: text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    socketRef.current?.emit("send-message", { sessionId: session._id, message: msg });
    setMessages((prev) => [...prev, msg]);
  };

  // Raise hand
  const raiseHand = () => {
    if (!session) return;
    socketRef.current?.emit("raise-hand", { sessionId: session._id, userName });
  };

  useEffect(() => {
    fetchSession().then((s) => {
      if (!s) return;

      // Connect socket
      const socket = io(SOCKET_URL);
      socketRef.current = socket;

      socket.emit("join-session", { sessionId: s._id, userName });

      socket.on("receive-message", (msg: ChatMessage) => {
        setMessages((prev) => [...prev, msg]);
      });

      socket.on("attachments-updated", (attachments: Attachment[]) => {
        setSession((prev) => prev ? { ...prev, attachments } : prev);
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [courseId]);

  return {
    session, messages, loading, error,
    startSession, endSession,
    uploadAttachments, deleteAttachment,
    sendMessage, raiseHand,
  };
}