import { useState } from 'react';
import {
  Star, Send, Trash2, MessageSquare, Loader2,
  ChevronDown, ChevronUp, Flag, X, CheckCircle, PenLine,
} from 'lucide-react';
import { useComments } from '../hooks/useComments';
import type { Comment } from '../hooks/useComments';
import { useLessonRating, useCourseRating } from '../hooks/useRating';
import { useAuth } from '../contexts/AuthContext';
import { useReportComment } from '../hooks/useReports';

// ── Reusable star row ─────────────────────────────────────────────────────────
function StarRow({
  value,
  interactive,
  size = 'md',
  onSelect,
}: {
  value: number;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onSelect?: (s: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  const cls = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={!interactive}
          onClick={() => onSelect?.(s)}
          onMouseEnter={() => interactive && setHovered(s)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={`transition-transform ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
        >
          <Star className={`${cls} transition-colors ${s <= display ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  );
}

// ── Course-wide average badge (named export — used by RecordedCourse) ─────────
export function CourseRatingInline({
  courseId,
  externalAverage,
  externalCount,
}: {
  courseId: string;
  externalAverage?: number;
  externalCount?: number;
}) {
  const { average: fetchedAvg, count: fetchedCount, loading } = useCourseRating(courseId);
  const average = externalAverage ?? fetchedAvg;
  const count   = externalCount   ?? fetchedCount;

  if (loading && externalAverage === undefined) {
    return <div className="flex items-center gap-1 text-gray-300"><Loader2 className="w-3 h-3 animate-spin" /></div>;
  }
  return (
    <div className="flex items-center gap-3">
      <span className="text-3xl font-bold text-gray-900 leading-none tabular-nums">
        {count === 0 ? '—' : average.toFixed(1)}
      </span>
      <div className="flex flex-col gap-1">
        <StarRow value={Math.round(average)} size="sm" />
        <p className="text-xs text-gray-400 leading-none">
          {count === 0 ? 'No ratings yet' : `${count} rating${count !== 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  );
}

// ── Lesson rating widget (named export — used by RecordedCourse) ──────────────
interface LessonRatingProps {
  courseId: string;
  lessonId: string;
  onCourseUpdate?: (avg: number, cnt: number) => void;
}

export function LessonRatingWidget({ courseId, lessonId, onCourseUpdate }: LessonRatingProps) {
  const { average, count, myStars, submitRating } = useLessonRating(courseId, lessonId);
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = async (stars: number) => {
    setSubmitting(true);
    try {
      const result = await submitRating(stars);
      onCourseUpdate?.(result.courseAverage, result.courseCount);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <StarRow value={myStars ?? 0} interactive onSelect={handleSelect} size="md" />
      {submitting && <p className="text-xs text-gray-400">Saving…</p>}
      {!submitting && count > 0 && (
        <p className="text-xs text-gray-400">
          Avg: {average.toFixed(1)} ({count} rating{count !== 1 ? 's' : ''})
        </p>
      )}
      {!submitting && myStars && (
        <p className="text-xs text-blue-500">Your rating: {myStars}★ (click to change)</p>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

function Avatar({ name, role }: { name: string; role?: string }) {
  const color = role === 'teacher' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700';
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${color}`}>
      {name?.[0]?.toUpperCase() || 'U'}
    </div>
  );
}

// ── Report modal ──────────────────────────────────────────────────────────────
function ReportModal({
  comment,
  onClose,
  onSubmit,
}: {
  comment: Comment;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    setErr('');
    try {
      await onSubmit(reason.trim());
      setDone(true);
      setTimeout(onClose, 1500);
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-500" /> Report Comment
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4 bg-gray-50 rounded-lg p-3 italic">
          "{comment.text.slice(0, 80)}{comment.text.length > 80 ? '…' : ''}"
        </p>
        {done ? (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-green-600 font-medium">Report submitted successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Reason *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                maxLength={500}
                rows={3}
                placeholder="Describe why this comment is inappropriate…"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none text-sm outline-none"
              />
              <p className="text-xs text-gray-400 mt-0.5 text-right">{reason.length}/500</p>
            </div>
            {err && <p className="text-xs text-red-500">{err}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !reason.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Reply bubble — Facebook style ─────────────────────────────────────────────
function ReplyBubble({
  reply,
  parentAuthorName,
  currentUserId,
  currentUserRole,
  onDelete,
  onReport,
}: {
  reply: Comment;
  parentAuthorName: string;
  currentUserId: string;
  currentUserRole: string;
  onDelete: (id: string, parentId?: string | null) => void;
  onReport?: (comment: Comment) => void;
}) {
  const isOwner = reply.studentId === currentUserId;
  const canDelete = isOwner || currentUserRole === 'teacher' || currentUserRole === 'admin';
  const replierRole = (reply as any).role as string | undefined;
  const isTeacherReply = replierRole === 'teacher';

  return (
    <div className="flex gap-2.5 group">
      <Avatar name={reply.studentName} role={replierRole} />
      <div className="flex-1 min-w-0">
        <div className="inline-block bg-gray-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-full">
          {/* Name + Author badge */}
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="text-xs font-bold text-gray-900">{reply.studentName}</span>
            {isTeacherReply && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                <PenLine className="w-2.5 h-2.5" /> Author
              </span>
            )}
          </div>
          {/* Text prefixed with @mention */}
          <p className="text-sm text-gray-800 break-words leading-relaxed">
            <span className="font-semibold text-blue-600 mr-1">{parentAuthorName}</span>
            {reply.text}
          </p>
        </div>
        {/* Meta row */}
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-[11px] text-gray-400">{formatDate(reply.createdAt)}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {currentUserRole === 'teacher' && onReport && (
              <button onClick={() => onReport(reply)}
                className="text-[11px] text-gray-400 hover:text-red-500 font-medium transition-colors">
                Report
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(reply._id, reply.parentId)}
                className="p-0.5 text-gray-300 hover:text-red-400 transition-colors" title="Delete">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Single comment + its replies ──────────────────────────────────────────────
function CommentItem({
  comment,
  currentUserId,
  currentUserRole,
  onDelete,
  onReply,
  onReport,
}: {
  comment: Comment;
  currentUserId: string;
  currentUserRole: string;
  onDelete: (id: string, parentId?: string | null) => void;
  onReply: (parentId: string, text: string) => Promise<void>;
  onReport: (comment: Comment) => void;
}) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const isOwner = comment.studentId === currentUserId;
  const canDelete = isOwner || currentUserRole === 'teacher' || currentUserRole === 'admin';
  const canReply = currentUserRole === 'teacher' || currentUserRole === 'student';
  const replies = comment.replies || [];
  const visibleReplies = showAllReplies ? replies : replies.slice(0, 1);
  const hiddenCount = replies.length - 1;
  const commentRole = (comment as any).role as string | undefined;

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await onReply(comment._id, replyText.trim());
      setReplyText('');
      setShowReplyBox(false);
      setShowAllReplies(true);
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="group">
      {/* Main comment bubble */}
      <div className="flex gap-3">
        <Avatar name={comment.studentName} role={commentRole} />
        <div className="flex-1 min-w-0">
          <div className="inline-block bg-gray-100 rounded-2xl rounded-tl-sm px-3.5 py-2.5 max-w-full">
            <span className="text-xs font-bold text-gray-900 block mb-0.5">{comment.studentName}</span>
            <p className="text-sm text-gray-800 whitespace-pre-line break-words leading-relaxed">
              {comment.text}
            </p>
          </div>
          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1 px-1">
            <span className="text-[11px] text-gray-400">{formatDate(comment.createdAt)}</span>
            {canReply && (
              <button
                onClick={() => setShowReplyBox((v) => !v)}
                className="text-[11px] font-semibold text-gray-500 hover:text-blue-600 transition-colors"
              >
                Reply
              </button>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
              {currentUserRole === 'teacher' && (
                <button onClick={() => onReport(comment)}
                  className="text-[11px] text-gray-400 hover:text-red-500 font-medium transition-colors">
                  Report
                </button>
              )}
              {canDelete && (
                <button onClick={() => onDelete(comment._id, comment.parentId)}
                  className="p-0.5 text-gray-300 hover:text-red-400 transition-colors" title="Delete">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Reply input */}
          {showReplyBox && (
            <form onSubmit={handleSubmitReply} className="mt-2 flex gap-2 items-center">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${comment.studentName}…`}
                maxLength={1000}
                autoFocus
                className="flex-1 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
              />
              <button
                type="submit"
                disabled={submittingReply || !replyText.trim()}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50"
              >
                {submittingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-2 ml-11 space-y-2">
          {visibleReplies.map((r) => (
            <ReplyBubble
              key={r._id}
              reply={r}
              parentAuthorName={comment.studentName}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onDelete={onDelete}
              onReport={currentUserRole === 'teacher' ? onReport : undefined}
            />
          ))}
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowAllReplies((v) => !v)}
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors mt-1 ml-1"
            >
              {showAllReplies
                ? <><ChevronUp className="w-3.5 h-3.5" /> Hide replies</>
                : <><ChevronDown className="w-3.5 h-3.5" /> View {hiddenCount} more {hiddenCount === 1 ? 'reply' : 'replies'}</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main CommentsAndRating component (default export) ─────────────────────────
interface CommentsProps {
  courseId: string;
  lessonId?: string;
  onCourseRatingUpdate?: (avg: number, cnt: number) => void;
  readOnlyMode?: boolean;
}

export default function CommentsAndRating({ courseId, lessonId, onCourseRatingUpdate, readOnlyMode }: CommentsProps) {
  const { user } = useAuth();
  const { comments, loading: commentsLoading, addComment, addReply, deleteComment } = useComments(courseId, lessonId);
  const { submitReport } = useReportComment();

  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reportTarget, setReportTarget] = useState<Comment | null>(null);

  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher';

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await addComment(text);
      setText('');
    } catch {
      setError('Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {reportTarget && (
        <ReportModal
          comment={reportTarget}
          onClose={() => setReportTarget(null)}
          onSubmit={(reason) => submitReport(reportTarget._id, reason)}
        />
      )}

      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-blue-500" />
        {lessonId ? 'Lesson Discussion' : 'Course Discussion'}
        {!commentsLoading && (
          <span className="ml-auto text-sm font-normal text-gray-400">
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </span>
        )}
      </h3>

      {/* Compose box — students only */}
      {isStudent && !readOnlyMode && (
        <form onSubmit={handleComment} className="mb-6">
          <div className="flex gap-3">
            <Avatar name={user.fullName} role="student" />
            <div className="flex-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder="Share your thoughts about this lesson…"
                className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                maxLength={1000}
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={submitting || !text.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Post
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Teacher info bar */}
      {isTeacher && (
        <div className="mb-4 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-xs text-blue-700 font-medium">
            You can reply to student comments and{' '}
            <span className="text-red-500 font-semibold">flag them</span> using the{' '}
            <Flag className="w-3 h-3 inline text-red-400" /> report button to notify the admin.
          </p>
        </div>
      )}

      {commentsLoading ? (
        <div className="flex items-center gap-2 text-gray-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading comments…
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No comments yet. {isStudent ? 'Be the first to share!' : 'No student activity yet.'}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {comments.map((c) => (
            <CommentItem
              key={c._id}
              comment={c}
              currentUserId={user?._id || ''}
              currentUserRole={user?.role || ''}
              onDelete={deleteComment}
              onReply={addReply}
              onReport={setReportTarget}
            />
          ))}
        </div>
      )}
    </div>
  );
}