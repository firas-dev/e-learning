import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

// Helper: all competition endpoints go through /rooms/:roomId/r/
const R = (roomId: string) => `${API}/rooms/${roomId}/r`;

export interface IChallenge {
  _id: string;
  roomId: string;
  teacherId: string;
  title: string;
  description: string;
  type: "quiz" | "coding" | "assignment" | "mini_project" | "timed";
  difficulty: "easy" | "medium" | "hard";
  totalPoints: number;
  bonusPoints: number;
  startsAt: string;
  endsAt: string;
  timeLimitMinutes?: number;
  status: "draft" | "upcoming" | "active" | "completed" | "cancelled";
  hideLeaderboard: boolean;
  allowResubmission: boolean;
  hints: { text?: string; pointsCost: number; revealed?: boolean }[];
  questions?: {
    _id: string;
    text: string;
    type: "mcq" | "short_answer";
    options?: { label: string }[];
    points: number;
  }[];
  participantCount: number;
}

export interface ISubmission {
  _id: string;
  score: number;
  bonusScore: number;
  totalScore: number;
  status: string;
  feedback?: string;
  submittedAt: string;
  attemptNumber: number;
  answers: { questionId?: string; answer: string; isCorrect?: boolean; earnedPoints?: number }[];
}

export interface IRoomStudentStats {
  totalPoints: number;
  level: number;
  badges: { id: string; name: string; icon: string; description: string; earnedAt: string }[];
  streak: { current: number; longest: number };
  challengesCompleted: number;
  challengesAttempted: number;
  hintsRequested: number;
  rank: number;
}

export interface ILeaderboardEntry {
  rank: number;
  student: { _id: string; fullName: string };
  totalPoints: number;
  level: number;
  badges: { id: string; icon: string; name: string }[];
  streak: number;
  challengesCompleted: number;
}

export interface IAnnouncement {
  _id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
}

export interface IThread {
  [x: string]: string;
  _id: string;
  authorId: string;
  authorName: string;
  authorRole: "student" | "teacher";
  text: string;
  parentId?: string;
  reactions: { emoji: string; userId: string }[];
  isHint: boolean;
  createdAt: string;
}

export function useCompetition(roomId: string) {
  const [challenges, setChallenges]       = useState<IChallenge[]>([]);
  const [announcements, setAnnouncements] = useState<IAnnouncement[]>([]);
  const [myStats, setMyStats]             = useState<IRoomStudentStats | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");

  const fetchAll = useCallback(async () => {
    if (!roomId) return;
    try {
      const [cRes, aRes, sRes] = await Promise.all([
        axios.get(`${R(roomId)}/challenges`),
        axios.get(`${R(roomId)}/announcements`),
        axios.get(`${R(roomId)}/my-stats`),
      ]);
      setChallenges(cRes.data);
      setAnnouncements(aRes.data);
      setMyStats(sRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load competition data.");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Challenge actions ────────────────────────────────────────────
  const createChallenge = async (data: Partial<IChallenge>) => {
    const res = await axios.post(`${R(roomId)}/challenges`, data);
    setChallenges((prev) => [...prev, res.data]);
    return res.data as IChallenge;
  };

  const updateChallenge = async (challengeId: string, data: Partial<IChallenge>) => {
    const res = await axios.patch(`${R(roomId)}/challenges/${challengeId}`, data);
    setChallenges((prev) => prev.map((c) => (c._id === challengeId ? res.data : c)));
    return res.data as IChallenge;
  };

  const deleteChallenge = async (challengeId: string) => {
    await axios.delete(`${R(roomId)}/challenges/${challengeId}`);
    setChallenges((prev) => prev.filter((c) => c._id !== challengeId));
  };

  // ── Submission ───────────────────────────────────────────────────
  const submitChallenge = async (challengeId: string, formData: FormData) => {
    const res = await axios.post(
      `${R(roomId)}/challenges/${challengeId}/submit`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    await fetchAll();
    return res.data as { submission: ISubmission; gamification: { newBadges: any[]; newLevel: number; newPoints: number } };
  };

  const getMySubmission = async (challengeId: string): Promise<ISubmission | null> => {
    try {
      const res = await axios.get(`${R(roomId)}/challenges/${challengeId}/my-submission`);
      return res.data;
    } catch {
      return null;
    }
  };

  // ── Leaderboard ──────────────────────────────────────────────────
  const getRoomLeaderboard = async (): Promise<ILeaderboardEntry[]> => {
    const res = await axios.get(`${R(roomId)}/leaderboard`);
    return res.data;
  };

  const getChallengeLeaderboard = async (challengeId: string) => {
    const res = await axios.get(`${R(roomId)}/challenges/${challengeId}/leaderboard`);
    return res.data;
  };

  // ── Timer ────────────────────────────────────────────────────────
  const startTimer = async (challengeId: string) => {
    const res = await axios.post(`${R(roomId)}/challenges/${challengeId}/timer/start`);
    return res.data as { expiresAt: string; alreadyStarted: boolean };
  };

  // ── Hints ────────────────────────────────────────────────────────
  const getHints = async (challengeId: string) => {
    const res = await axios.get(`${R(roomId)}/challenges/${challengeId}/hints`);
    return res.data as { index: number; pointsCost: number; revealed: boolean; text?: string }[];
  };

  const useHint = async (challengeId: string, hintIndex: number) => {
    const res = await axios.post(`${R(roomId)}/challenges/${challengeId}/hints/${hintIndex}/use`);
    await fetchAll();
    return res.data as { hint: string; pointsDeducted: number };
  };

  // ── Threads ──────────────────────────────────────────────────────
  const getThreads = async (challengeId: string): Promise<IThread[]> => {
    const res = await axios.get(`${R(roomId)}/challenges/${challengeId}/threads`);
    return res.data;
  };

  const postThread = async (challengeId: string, text: string, parentId?: string) => {
    const res = await axios.post(`${R(roomId)}/challenges/${challengeId}/threads`, {
      text, parentId,
    });
    return res.data as IThread;
  };

  const reactToThread = async (challengeId: string, threadId: string, emoji: string) => {
    const res = await axios.post(
      `${R(roomId)}/challenges/${challengeId}/threads/${threadId}/react`,
      { emoji }
    );
    return res.data as IThread;
  };

  const deleteThread = async (challengeId: string, threadId: string) => {
    await axios.delete(`${R(roomId)}/challenges/${challengeId}/threads/${threadId}`);
  };

  // ── Announcements ────────────────────────────────────────────────
  const postAnnouncement = async (data: { title: string; body: string; pinned?: boolean }) => {
    const res = await axios.post(`${R(roomId)}/announcements`, data);
    setAnnouncements((prev) => [res.data, ...prev]);
    return res.data as IAnnouncement;
  };

  const deleteAnnouncement = async (announcementId: string) => {
    await axios.delete(`${R(roomId)}/announcements/${announcementId}`);
    setAnnouncements((prev) => prev.filter((a) => a._id !== announcementId));
  };

  // ── Analytics ────────────────────────────────────────────────────
  const getAnalytics = async () => {
    const res = await axios.get(`${R(roomId)}/analytics`);
    return res.data;
  };

  // ── Grade submission (teacher) ───────────────────────────────────
  const gradeSubmission = async (challengeId: string, submissionId: string, score: number, feedback: string) => {
    const res = await axios.patch(
      `${R(roomId)}/challenges/${challengeId}/submissions/${submissionId}/grade`,
      { score, feedback }
    );
    return res.data;
  };

  const getSubmissions = async (challengeId: string) => {
    const res = await axios.get(`${R(roomId)}/challenges/${challengeId}/submissions`);
    return res.data;
  };

  const awardPoints = async (studentId: string, points: number, reason: string) => {
    const res = await axios.post(`${R(roomId)}/students/${studentId}/award-points`, {
      points, reason,
    });
    return res.data;
  };

  return {
    challenges, announcements, myStats, loading, error,
    refetch: fetchAll,
    createChallenge, updateChallenge, deleteChallenge,
    submitChallenge, getMySubmission,
    getRoomLeaderboard, getChallengeLeaderboard,
    startTimer,
    getHints, useHint,
    getThreads, postThread, reactToThread, deleteThread,
    postAnnouncement, deleteAnnouncement,
    getAnalytics,
    gradeSubmission, getSubmissions,
    awardPoints,
  };
}