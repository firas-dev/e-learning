import { useState } from 'react';
import {
  Star, Send, Trash2, MessageSquare, Loader2,
  CornerDownRight, ChevronDown, ChevronUp,
  Flag, X, CheckCircle,
} from 'lucide-react';
import { useComments, Comment } from '../hooks/useComments';
import { useLessonRating, useCourseRating } from '../hooks/useRating';
import { useAuth } from '../contexts/AuthContext';
import { useReportComment } from '../hooks/useReports';

// ── Reusable star row ────────────────────────────────────────────────────
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

// ── Course-wide average badge ────────────────────────────────────────────
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

// ── Lesson rating widget ─────────────────────────────────────────────────
interface LessonRatingProps {
  courseId: string;
  lessonId: string;
  onCourseUpdate?: (avg: number, cnt: number) => void;
}

export function LessonRatingWidget({ courseId, lessonId, onCourseUpdate }: LessonRatingProps) {
  const { user } = useAuth();
  const { average, count, myStars, loading, submitRating } = useLessonRating(courseId, lessonId);
  const [submitting, setSubmitting] = useState(false);

  if (!lessonId) return null;
  if (user?.role !== 'student') return null;

  const handleRate = async (stars: number) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await submitRating(stars);
      onCourseUpdate?.(result.courseAverage, result.courseCount);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />;

  return (
    <div className="flex items-center gap-4 py-3 px-4 bg-yellow-50 border border-yellow-100 rounded-xl">
      <div className={`flex items-center gap-2 ${submitting ? 'opacity-50 pointer-events-none' : ''}`}>
        <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
          {myStars ? 'Your rating:' : 'Rate this lesson:'}
        </span>
        <StarRow value={myStars ?? 0} interactive size="md" onSelect={handleRate} />
        {myStars && (
          <span className="text-xs text-green-600 font-medium">✓</span>
        )}
      </div>
    </div>
  );
}

// ── Report modal ─────────────────────────────────────────────────────────
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
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-500" />
            <h3 className="font-bold text-gray-900 text-sm">Report Inappropriate Comment</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="p-6 text-center">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-900">Report submitted</p>
            <p className="text-sm text-gray-500 mt-1">The admin team will review this comment shortly.</p>
            <button
              onClick={onClose}
              className="mt-4 px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Comment preview */}
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-xs text-red-500 font-medium mb-1">Comment being reported</p>
              <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-line">{comment.text}</p>
              <p className="text-xs text-gray-400 mt-1.5">by {comment.studentName}</p>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Describe why this comment is inappropriate (e.g. harassment, hate speech, spam)…"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none text-sm outline-none"
              />
              <p className="text-xs text-gray-400 mt-0.5 text-right">{reason.length}/500</p>
            </div>

            {err && <p className="text-xs text-red-500">{err}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !reason.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
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

// ── Single reply bubble ───────────────────────────────────────────────────
function ReplyBubble({
  reply,
  currentUserId,
  currentUserRole,
  onDelete,
  onReport,
}: {
  reply: Comment;
  currentUserId: string;
  currentUserRole: string;
  onDelete: (id: string, parentId?: string | null) => void;
  onReport?: (comment: Comment) => void;
}) {
  const isOwner = reply.studentId === currentUserId;
  const canDelete = isOwner || currentUserRole === 'teacher' || currentUserRole === 'admin';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="flex gap-2.5">
      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
        {reply.studentName?.[0]?.toUpperCase() || 'U'}
      </div>
      <div className="flex-1 min-w-0 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-900">{reply.studentName}</span>
            <span className="text-xs text-gray-400">{formatDate(reply.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            {currentUserRole === 'teacher' && onReport && (
              <button
                onClick={() => onReport(reply)}
                className="p-0.5 text-gray-300 hover:text-red-400 transition-colors"
                title="Report this reply"
              >
                <Flag className="w-3 h-3" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(reply._id, reply.parentId)}
                className="p-0.5 text-gray-300 hover:text-red-400 transition-colors"
                title="Delete reply"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-line break-words leading-relaxed">
          {reply.text}
        </p>
      </div>
    </div>
  );
}

// ── Single comment + its replies ─────────────────────────────────────────
function CommentItem({
  comment,
  currentUserId,
  currentUserRole,
  onDelete,
  onReply,
  onReport,
  depth = 0,
}: {
  comment: Comment;
  currentUserId: string;
  currentUserRole: string;
  onDelete: (id: string, parentId?: string | null) => void;
  onReply: (parentId: string, text: string) => Promise<void>;
  onReport: (comment: Comment) => void;
  depth?: number;
}) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showAllReplies, setShowAllReplies] = useState(false);

  const isOwner = comment.studentId === currentUserId;
  const canDelete = isOwner || currentUserRole === 'teacher' || currentUserRole === 'admin';
  const canReply = currentUserRole === 'teacher' || currentUserRole === 'student';
  const replies = comment.replies || [];
  const firstReply = replies[0];
  const remainingReplies = replies.slice(1);
  const hasMoreReplies = remainingReplies.length > 0;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

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
    <div className={depth > 0 ? 'ml-8 border-l-2 border-blue-100 pl-4' : ''}>
      {/* Comment bubble */}
      <div className="flex gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
          depth === 0 ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'
        }`}>
          {comment.studentName?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{comment.studentName}</span>
            <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
            {canReply && depth === 0 && (
              <button
                onClick={() => setShowReplyBox((v) => !v)}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1 ml-auto"
              >
                <CornerDownRight className="w-3 h-3" />
                {showReplyBox ? 'Cancel' : 'Reply'}
              </button>
            )}
            {/* Report button — teachers only */}
            {currentUserRole === 'teacher' && (
              <button
                onClick={() => onReport(comment)}
                className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                title="Report this comment as inappropriate"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(comment._id, comment.parentId)}
                className={`p-1 text-gray-300 hover:text-red-400 transition-colors ${canReply && depth === 0 ? '' : 'ml-auto'}`}
                title="Delete comment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-line break-words leading-relaxed">
            {comment.text}
          </p>

          {/* Reply box */}
          {showReplyBox && (
            <form onSubmit={handleSubmitReply} className="mt-3 flex gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply…"
                maxLength={1000}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
              />
              <button
                type="submit"
                disabled={submittingReply || !replyText.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
              >
                {submittingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Send
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="mt-3 space-y-2.5 pl-11">
          {firstReply && (
            <ReplyBubble
              reply={firstReply}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              onDelete={onDelete}
              onReport={currentUserRole === 'teacher' ? onReport : undefined}
            />
          )}
          {showAllReplies &&
            remainingReplies.map((r) => (
              <ReplyBubble
                key={r._id}
                reply={r}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                onDelete={onDelete}
                onReport={currentUserRole === 'teacher' ? onReport : undefined}
              />
            ))}
          {hasMoreReplies && (
            <button
              onClick={() => setShowAllReplies((v) => !v)}
              className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 font-medium"
            >
              {showAllReplies ? (
                <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
              ) : (
                <><ChevronDown className="w-3.5 h-3.5" /> Show {remainingReplies.length} more {remainingReplies.length === 1 ? 'reply' : 'replies'}</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main CommentsAndRating component ─────────────────────────────────────
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
      {/* Report modal */}
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
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {user.fullName?.[0]?.toUpperCase() || 'S'}
            </div>
            <div className="flex-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder="Share your thoughts about this lesson…"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                maxLength={1000}
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={submitting || !text.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            You can reply to student comments, delete inappropriate ones, or{' '}
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