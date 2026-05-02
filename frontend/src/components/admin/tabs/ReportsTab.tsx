import { useState } from "react";
import {
  Flag,
  Loader2,
  UserX,
  AlertTriangle,
  X,
  CheckCircle,
  Clock,
  Eye,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { useAdminReports, Report } from "../../../hooks/useReports";

// ── Status badge helper ──────────────────────────────────────────────────
function StatusBadge({ status }: { status: Report["status"] }) {
  const map: Record<string, { label: string; className: string }> = {
    pending:        { label: "Pending",    className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    resolved_ban:   { label: "Banned",     className: "bg-red-100 text-red-700 border-red-200" },
    resolved_alert: { label: "Alerted",    className: "bg-orange-100 text-orange-700 border-orange-200" },
    dismissed:      { label: "Dismissed",  className: "bg-gray-100 text-gray-500 border-gray-200" },
  };
  const { label, className } = map[status] || map.pending;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${className}`}>
      {label}
    </span>
  );
}

// ── Report detail modal ─────────────────────────────────────────────────
function ReportModal({
  report,
  onClose,
  onResolve,
  actionLoading,
}: {
  report: Report;
  onClose: () => void;
  onResolve: (id: string, action: "ban" | "alert" | "dismiss") => void;
  actionLoading: string | null;
}) {
  const isPending = report.status === "pending";
  const isLoading = actionLoading === report._id;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h2 className="font-bold text-gray-900">Report Details</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Status:</span>
            <StatusBadge status={report.status} />
          </div>

          {/* Student info */}
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 font-medium mb-1">Reported Student</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm">
                {report.studentName?.[0]?.toUpperCase() || "S"}
              </div>
              <p className="font-semibold text-gray-900 text-sm">{report.studentName}</p>
            </div>
          </div>

          {/* Comment */}
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-xs text-red-500 font-medium mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Flagged Comment
            </p>
            <p className="text-sm text-gray-800 whitespace-pre-line break-words leading-relaxed">
              {report.commentText}
            </p>
          </div>

          {/* Reason */}
          <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
            <p className="text-xs text-orange-500 font-medium mb-1">Reason from Teacher</p>
            <p className="text-sm text-gray-700">{report.reason}</p>
            <p className="text-xs text-gray-400 mt-1.5">Reported by {report.teacherName}</p>
          </div>

          {/* Timestamps */}
          <p className="text-xs text-gray-400">
            Reported on {new Date(report.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            {report.resolvedAt && ` · Resolved ${new Date(report.resolvedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
          </p>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="flex gap-2 p-5 pt-0">
            <button
              onClick={() => onResolve(report._id, "ban")}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
              Ban Student
            </button>
            <button
              onClick={() => onResolve(report._id, "alert")}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              Send Warning
            </button>
            <button
              onClick={() => onResolve(report._id, "dismiss")}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Dismiss
            </button>
          </div>
        )}
        {!isPending && (
          <div className="p-5 pt-0">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ReportsTab ──────────────────────────────────────────────────────
export default function ReportsTab() {
  const { reports, loading, pendingCount, actionLoading, resolveReport } = useAdminReports();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("all");

  const filtered = reports.filter((r) => {
    if (filter === "pending") return r.status === "pending";
    if (filter === "resolved") return r.status !== "pending";
    return true;
  });

  const handleResolve = async (id: string, action: "ban" | "alert" | "dismiss") => {
    await resolveReport(id, action);
    setSelectedReport(null);
  };

  return (
    <div>
      {selectedReport && (
        <ReportModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onResolve={handleResolve}
          actionLoading={actionLoading}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Flag className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Comment Reports</h2>
            <p className="text-xs text-gray-500">Review flagged student comments from teachers</p>
          </div>
          {pendingCount > 0 && (
            <span className="px-2.5 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
              {pendingCount} pending
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        {(["all", "pending", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Flag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No reports found</p>
          <p className="text-sm mt-1">
            {filter === "pending" ? "All reports have been reviewed." : "No reports yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((report) => (
            <div
              key={report._id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {report.studentName?.[0]?.toUpperCase() || "S"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-900 text-sm">{report.studentName}</span>
                      <StatusBadge status={report.status} />
                      {report.status === "pending" && (
                        <span className="flex items-center gap-1 text-xs text-yellow-600">
                          <Clock className="w-3 h-3" /> Needs review
                        </span>
                      )}
                    </div>

                    {/* Comment preview */}
                    <p className="text-sm text-gray-600 truncate mb-1">
                      <span className="text-gray-400 text-xs">Comment: </span>
                      {report.commentText}
                    </p>

                    {/* Reason preview */}
                    <p className="text-xs text-orange-600 truncate">
                      <span className="font-medium">Reason: </span>{report.reason}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      Reported by {report.teacherName} · {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => setSelectedReport(report)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium transition-colors flex-shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Review
                </button>
              </div>

              {/* Resolved banner */}
              {report.status !== "pending" && (
                <div className={`mt-3 pt-3 border-t flex items-center gap-2 text-xs ${
                  report.status === "resolved_ban"   ? "text-red-600" :
                  report.status === "resolved_alert" ? "text-orange-600" :
                  "text-gray-400"
                }`}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  {report.status === "resolved_ban"   && "Student was banned"}
                  {report.status === "resolved_alert" && "Warning sent to student"}
                  {report.status === "dismissed"      && "Report dismissed"}
                  {report.resolvedAt && ` · ${new Date(report.resolvedAt).toLocaleDateString()}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}