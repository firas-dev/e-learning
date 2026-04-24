import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:5000/api/admin";

// ── Types ──────────────────────────────────────────────────────────────────
export interface AdminStats {
  users: {
    total: number;
    students: number;
    teachers: number;
    admins: number;
    banned: number;
    newLast30Days: number;
  };
  courses: {
    total: number;
    published: number;
    draft: number;
  };
  enrollments: {
    total: number;
    newLast30Days: number;
    avgProgress: number;
    totalLearningHours: number;
  };
  content: {
    lessons: number;
    ratings: number;
    comments: number;
  };
  charts: {
    userGrowth: { month: string; count: number }[];
    enrollmentGrowth: { month: string; count: number }[];
  };
}

export interface AdminUser {
  _id: string;
  fullName: string;
  email: string;
  role: "student" | "teacher" | "admin";
  isBanned?: boolean;
  createdAt: string;
  stats?: {
    enrollments?: number;
    completed?: number;
    courses?: number;
    students?: number;
  };
}

export interface AdminCourse {
  _id: string;
  title: string;
  description: string;
  type: "live" | "recorded";
  duration: number;
  is_published: boolean;
  scheduledAt?: string;
  createdAt: string;
  teacherId: { _id: string; fullName: string; email: string };
  enrollmentCount: number;
  lessonCount: number;
  avgRating: number;
}

// ── Stats Hook ─────────────────────────────────────────────────────────────
export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/stats`)
      .then((r) => setStats(r.data))
      .catch((e) => setError(e?.response?.data?.message || "Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading, error };
}

// ── Users Hook ─────────────────────────────────────────────────────────────
export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/users`, {
        params: { search, role: roleFilter, status: statusFilter, sortBy, page, limit: 10 },
      });
      setUsers(r.data.users);
      setTotal(r.data.total);
      setTotalPages(r.data.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, sortBy, page]);

  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter, sortBy]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleBan = async (userId: string) => {
    setActionLoading(userId);
    try {
      const r = await axios.patch(`${API}/users/${userId}/ban`);
      setUsers((prev) =>
        prev.map((u) => u._id === userId ? { ...u, isBanned: r.data.isBanned } : u)
      );
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const updateUser = async (userId: string, data: Partial<AdminUser> & { password?: string }) => {
    const r = await axios.patch(`${API}/users/${userId}`, data);
    setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, ...r.data } : u));
    return r.data;
  };

  const deleteUser = async (userId: string) => {
    setActionLoading(userId);
    try {
      await axios.delete(`${API}/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      setTotal((t) => t - 1);
    } catch (e) { throw e; }
    finally { setActionLoading(null); }
  };

  return {
    users, total, totalPages, loading, actionLoading,
    search, setSearch, roleFilter, setRoleFilter,
    statusFilter, setStatusFilter, sortBy, setSortBy,
    page, setPage, toggleBan, updateUser, deleteUser, refetch: fetchUsers,
  };
}

// ── Courses Hook ───────────────────────────────────────────────────────────
export function useAdminCourses() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/courses`, {
        params: { search, type: typeFilter, status: statusFilter, sortBy, page, limit: 10 },
      });
      setCourses(r.data.courses);
      setTotal(r.data.total);
      setTotalPages(r.data.totalPages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, sortBy, page]);

  useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter, sortBy]);
  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const togglePublish = async (courseId: string) => {
    setActionLoading(courseId);
    try {
      const r = await axios.patch(`${API}/courses/${courseId}/publish`);
      setCourses((prev) =>
        prev.map((c) => c._id === courseId ? { ...c, is_published: r.data.is_published } : c)
      );
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const deleteCourse = async (courseId: string) => {
    setActionLoading(courseId);
    try {
      await axios.delete(`${API}/courses/${courseId}`);
      setCourses((prev) => prev.filter((c) => c._id !== courseId));
      setTotal((t) => t - 1);
    } catch (e) { throw e; }
    finally { setActionLoading(null); }
  };

  return {
    courses, total, totalPages, loading, actionLoading,
    search, setSearch, typeFilter, setTypeFilter,
    statusFilter, setStatusFilter, sortBy, setSortBy,
    page, setPage, togglePublish, deleteCourse, refetch: fetchCourses,
  };
}

// ── Announcement Hook ──────────────────────────────────────────────────────
export function useAnnouncement() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ message: string; count: number } | null>(null);
  const [error, setError] = useState("");

  const send = async (title: string, message: string, targetRole: string) => {
    setSending(true);
    setResult(null);
    setError("");
    try {
      const r = await axios.post(`${API}/announce`, { title, message, targetRole });
      setResult(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to send announcement.");
    } finally {
      setSending(false);
    }
  };

  return { send, sending, result, error, clearResult: () => setResult(null) };
}