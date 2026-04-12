import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export interface CatalogCourse {
  _id: string;
  title: string;
  description: string;
  type: "live" | "recorded";
  duration: number;
  scheduledAt?: string;
  teacherId: { _id: string; fullName: string };
  enrollmentCount: number;
  averageRating: number;
}

export function useCatalog() {
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  // ✅ Filter / search / pagination state
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "live" | "recorded">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const [catalogRes, myRes] = await Promise.all([
        axios.get(`${API}/enrollments/catalog`, {
          params: { search, type: typeFilter, page, limit: 6 },
        }),
        axios.get(`${API}/enrollments/my`),
      ]);
      setCourses(catalogRes.data.courses);
      setTotalPages(catalogRes.data.totalPages);
      setTotal(catalogRes.data.total);
      setEnrolledIds(myRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const enroll = async (courseId: string) => {
    setEnrolling(courseId);
    try {
      await axios.post(`${API}/enrollments/${courseId}/enroll`);
      setEnrolledIds((prev) => [...prev, courseId]);
    } finally {
      setEnrolling(null);
    }
  };

  const unenroll = async (courseId: string) => {
    setEnrolling(courseId);
    try {
      await axios.delete(`${API}/enrollments/${courseId}/unenroll`);
      setEnrolledIds((prev) => prev.filter((id) => id !== courseId));
    } finally {
      setEnrolling(null);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, typeFilter]);

  useEffect(() => { fetchCatalog(); }, [search, typeFilter, page]);

  return {
    courses, enrolledIds, loading, enrolling,
    enroll, unenroll,
    search, setSearch,
    typeFilter, setTypeFilter,
    page, setPage,
    totalPages, total,
  };
}