import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export interface ConversationPartner {
  _id: string;
  fullName: string;
  email: string;
}

export interface Conversation {
  _id: string;
  partner: ConversationPartner;
  course?: { _id: string; title: string };
  lastMessage?: string;
  lastMessageAt?: string;
  unread: number;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  text: string;
  read: boolean;
  createdAt: string;
}

export interface MessageableUser {
  _id: string;
  fullName: string;
  email: string;
  courseTitle: string;
}

export function useMessages(userId: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageableUsers, setMessageableUsers] = useState<MessageableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/messages/conversations`);
      setConversations(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/messages/unread-count`);
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchMessageableUsers = useCallback(async (role: string) => {
    try {
      const endpoint = role === "student" ? "teachers" : "students";
      const res = await axios.get(`${API}/messages/${endpoint}`);
      setMessageableUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const openConversation = useCallback(async (conversation: Conversation) => {
    setActiveConversation(conversation);
    setMessagesLoading(true);
    try {
      const res = await axios.get(`${API}/messages/conversations/${conversation._id}`);
      setMessages(res.data);
      // Clear unread locally
      setConversations((prev) =>
        prev.map((c) => (c._id === conversation._id ? { ...c, unread: 0 } : c))
      );
      fetchUnreadCount();
    } catch (err) {
      console.error(err);
    } finally {
      setMessagesLoading(false);
    }
  }, [fetchUnreadCount]);

  const startConversation = useCallback(async (partnerId: string, role: string) => {
    try {
      const res = await axios.post(`${API}/messages/conversations`, { partnerId });
      const conv = res.data;
      // Build our Conversation shape
      const partner = role === "student" ? conv.teacherId : conv.studentId;
      const shaped: Conversation = {
        _id: conv._id,
        partner,
        course: conv.courseId,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unread: 0,
      };
      setActiveConversation(shaped);
      setMessages([]);
      await fetchConversations();
      return shaped;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || "Failed to start conversation.");
    }
  }, [fetchConversations]);

  const sendMessage = useCallback(async (text: string) => {
    if (!activeConversation || !text.trim()) return;
    setSending(true);
    try {
      const res = await axios.post(
        `${API}/messages/conversations/${activeConversation._id}`,
        { text }
      );
      setMessages((prev) => [...prev, res.data]);
      setConversations((prev) =>
        prev.map((c) =>
          c._id === activeConversation._id
            ? { ...c, lastMessage: text.trim().slice(0, 100), lastMessageAt: new Date().toISOString() }
            : c
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }, [activeConversation]);

  const pollMessages = useCallback(async () => {
    if (!activeConversation) return;
    try {
      const res = await axios.get(`${API}/messages/conversations/${activeConversation._id}`);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [activeConversation]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchConversations(), fetchUnreadCount()]);
      setLoading(false);
    };
    init();
  }, [fetchConversations, fetchUnreadCount]);

  // Poll for new messages every 4 seconds when a conversation is open
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (activeConversation) {
      pollRef.current = setInterval(pollMessages, 4000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeConversation, pollMessages]);

  // Poll unread count every 30s
  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return {
    conversations,
    activeConversation,
    setActiveConversation,
    messages,
    messageableUsers,
    loading,
    messagesLoading,
    unreadCount,
    sending,
    fetchConversations,
    fetchMessageableUsers,
    openConversation,
    startConversation,
    sendMessage,
  };
}