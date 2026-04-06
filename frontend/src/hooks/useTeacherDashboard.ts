import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export interface Course {
  _id: string;
  title: string;
  description: string;
  is_published: boolean;
  duration: number;
  type: "live" | "recorded";
  scheduledAt?: string;
  enrollmentCount: number;
}

interface DashboardData {
  courses: Course[];
  totalStudents: number;
  averageEngagement: number;
  total: number;
  totalPages: number;
  page: number;
}

export function useTeacherDashboard() {
  const [data, setData] = useState<DashboardData>({
    courses: [],
    totalStudents: 0,
    averageEngagement: 0,
    total: 0,
    totalPages: 1,
    page: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ Filter / search / pagination state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "live" | "recorded">("all");
  const [page, setPage] = useState(1);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/teacher/dashboard`, {
        params: { search, type: typeFilter, page, limit: 5 },
      });
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const createCourse = async (form: {
    title: string;
    description: string;
    course_type: "live" | "recorded";
    duration_hours: number;
    scheduledAt?: string;
  }) => {
    const res = await axios.post(`${API}/teacher/courses`, form);
    // Refresh to get updated list with count
    fetchDashboard();
    return res.data;
  };

  const deleteCourse = async (courseId: string) => {
    await axios.delete(`${API}/teacher/courses/${courseId}`);
    fetchDashboard();
  };

  const togglePublish = async (courseId: string) => {
    const res = await axios.patch(
      `${API}/teacher/courses/${courseId}/publish`
    );
    setData((prev) => ({
      ...prev,
      courses: prev.courses.map((c) =>
        c._id === courseId ? { ...c, is_published: res.data.is_published } : c
      ),
    }));
  };

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, typeFilter]);

  useEffect(() => { fetchDashboard(); }, [search, typeFilter, page]);

  return {
    data,
    loading,
    error,
    createCourse,
    deleteCourse,
    togglePublish,
    search, setSearch,
    typeFilter, setTypeFilter,
    page, setPage,
  };
}