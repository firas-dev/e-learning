import { useState, useEffect, useRef } from "react";
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
  createdAt?: string;
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
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "live" | "recorded">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "most_enrolled" | "least_enrolled">("newest");
  const [page, setPage] = useState(1);

  // Tracks whether the initial load has happened — useRef, never useState
  const initialLoadDone = useRef(false);

  const fetchDashboard = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setCoursesLoading(true);
    }
    try {
      const res = await axios.get(`${API}/teacher/dashboard`, {
        params: { search, type: typeFilter, sortBy, page, limit: 5 },
      });
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
      setCoursesLoading(false);
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
    fetchDashboard();
    return res.data;
  };

  const deleteCourse = async (courseId: string) => {
    await axios.delete(`${API}/teacher/courses/${courseId}`);
    fetchDashboard();
  };

  const togglePublish = async (courseId: string) => {
    const res = await axios.patch(`${API}/teacher/courses/${courseId}/publish`);
    setData((prev) => ({
      ...prev,
      courses: prev.courses.map((c) =>
        c._id === courseId ? { ...c, is_published: res.data.is_published } : c
      ),
    }));
  };

  // Reset to page 1 when filters/sort change
  useEffect(() => { setPage(1); }, [search, typeFilter, sortBy]);

  // Initial load
  useEffect(() => {
    fetchDashboard(true);
    initialLoadDone.current = true;
  }, []);

  // Refetch when filters / sort / page change — skip the very first render
  useEffect(() => {
    if (!initialLoadDone.current) return;
    fetchDashboard(false);
  }, [search, typeFilter, sortBy, page]);

  return {
    data,
    loading,
    coursesLoading,
    error,
    createCourse,
    deleteCourse,
    togglePublish,
    search, setSearch,
    typeFilter, setTypeFilter,
    sortBy, setSortBy,
    page, setPage,
  };
}