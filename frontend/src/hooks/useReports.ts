import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:5000/api";

export interface Report {
  _id: string;
  commentId: string;
  commentText: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  courseId: string;
  lessonId?: string;
  reason: string;
  status: "pending" | "resolved_ban" | "resolved_alert" | "dismissed";
  createdAt: string;
  resolvedAt?: string;
}

// ── Teacher: submit a report ─────────────────────────────────────────────
export function useReportComment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submitReport = async (commentId: string, reason: string) => {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      await axios.post(`${API}/reports`, { commentId, reason });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to submit report.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { submitReport, loading, error, success };
}

// ── Admin: list all reports ──────────────────────────────────────────────
export function useAdminReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsRes, countRes] = await Promise.all([
        axios.get(`${API}/reports`),
        axios.get(`${API}/reports/pending-count`),
      ]);
      setReports(reportsRes.data);
      setPendingCount(countRes.data.count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const resolveReport = async (reportId: string, action: "ban" | "alert" | "dismiss") => {
    setActionLoading(reportId);
    try {
      const res = await axios.patch(`${API}/reports/${reportId}/resolve`, { action });
      setReports((prev) =>
        prev.map((r) => (r._id === reportId ? res.data : r))
      );
      if (action !== "dismiss") {
        setPendingCount((c) => Math.max(0, c - 1));
      } else {
        setPendingCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  return { reports, loading, pendingCount, actionLoading, resolveReport, refetch: fetchReports };
}