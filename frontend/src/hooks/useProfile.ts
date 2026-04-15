import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export interface TeacherCourse {
  _id: string;
  title: string;
  description: string;
  type: "live" | "recorded";
  duration: number;
  is_published: boolean;
  scheduledAt?: string;
  createdAt?: string;
  enrollmentCount: number;
  lessonCount: number;
  avgRating: number;
  ratingCount: number;
}

export interface TeacherStats {
  totalCourses: number;
  publishedCourses: number;
  totalStudents: number;
  avgCompletion: number;
  totalLessons: number;
  totalLearningHours: number;
  overallRating: number;
  totalRatings: number;
}

export interface TeacherProfileData {
  teacher: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
    createdAt: string;
  };
  courses: TeacherCourse[];
  stats: TeacherStats;
  recentComments: Array<{
    _id: string;
    studentName: string;
    text: string;
    createdAt: string;
    courseId: string;
  }>;
}

export interface StudentEnrollment {
  id: string;
  progress: number;
  completedLessons: string[];
  learningTime: number;
  lastAccessed: string;
  course: {
    _id: string;
    title: string;
    description: string;
    type: "live" | "recorded";
    duration: number;
    scheduledAt?: string;
    createdAt?: string;
  } | null;
}

export interface StudentStats {
  totalEnrolled: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  avgProgress: number;
  totalLearningTime: number;
  totalRatingsGiven: number;
  totalCommentsPosted: number;
}

export interface StudentProfileData {
  student: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
    createdAt: string;
  };
  enrollments: StudentEnrollment[];
  stats: StudentStats;
  recentComments: Array<{
    _id: string;
    text: string;
    createdAt: string;
    courseId: string;
  }>;
}

export function useTeacherProfile(userId?: string) {
  const [data, setData] = useState<TeacherProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const url = userId
      ? `${API}/profile/teacher/${userId}`
      : `${API}/profile/me`;

    axios
      .get(url)
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.response?.data?.message || "Failed to load profile."))
      .finally(() => setLoading(false));
  }, [userId]);

  return { data, loading, error };
}

export function useStudentProfile(userId?: string) {
  const [data, setData] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const url = userId
      ? `${API}/profile/student/${userId}`
      : `${API}/profile/me`;

    axios
      .get(url)
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.response?.data?.message || "Failed to load profile."))
      .finally(() => setLoading(false));
  }, [userId]);

  return { data, loading, error };
}