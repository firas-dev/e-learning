import { useEffect, useState } from "react";
import axios from "axios";

interface Course {
  _id: string;
  title: string;
  description: string;
  type: "live" | "recorded";
  duration: number;
  scheduledAt?: string;
  createdAt?: string;
  enrollmentCount?: number;
  averageRating: number;
}

interface Enrollment {
  id: string;
  progress: number;
  lastAccessed: string;
  learningTime: number;
  course: Course;
}

interface UpcomingSession {
  id: string;
  title: string;
  scheduledAt: string;
  courseId: string;
  duration: number;
}

interface DashboardStats {
  totalCourses: number;
  avgProgress: number;
  totalLearningTime: number;
}

interface DashboardData {
  enrollments: Enrollment[];
  stats: DashboardStats;
  upcomingSessions: UpcomingSession[];
}

export function useStudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/student/dashboard");
        setData(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, []);

  return { data, loading, error };
}