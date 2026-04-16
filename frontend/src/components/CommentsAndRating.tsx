import { useState } from 'react';
import { Star, Send, Trash2, MessageSquare, Loader2, CornerDownRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useComments, Comment } from '../hooks/useComments';
import { useLessonRating, useCourseRating } from '../hooks/useRating';
import { useAuth } from '../contexts/AuthContext';

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

// ── Single comment + its replies ─────────────────────────────────────────
function CommentItem({
  comment,
  currentUserId,
  currentUserRole,
  onDelete,
  onReply,
  depth = 0,
}: {
  comment: Comment;
  currentUserId: string;
  currentUserRole: string;
  onDelete: (id: string, parentId?: string | null) => void;
  onReply: (parentId: string, text: string) => Promise<void>;
  depth?: number;
}) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const isOwner = comment.studentId === currentUserId;
  const canDelete = isOwner || currentUserRole === 'teacher' || currentUserRole === 'admin';
  const canReply = currentUserRole === 'teacher' || currentUserRole === 'student';
  const replies = comment.replies || [];

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
      setShowReplies(true);
    } finally {
      setSubmittingReply(false);
    }
  };

  const isTeacherReply = (c: Comment) => false; // placeholder; backend doesn't expose role here
  // We detect teacher replies by checking if the name differs from typical student names
  // For now we just show all replies the same way — the teacher's name distinguishes them

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

          {/* Reply input */}
          {showReplyBox && (
            <form onSubmit={handleSubmitReply} className="mt-3">
              <div className="flex gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  placeholder="Write a reply…"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  maxLength={1000}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={submittingReply || !replyText.trim()}
                  className="self-end flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {submittingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Post
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && depth === 0 && (
        <div className="mt-3 ml-11">
          <button
            onClick={() => setShowReplies((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2 transition-colors"
          >
            {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </button>
          {showReplies && (
            <div className="space-y-3">
              {replies.map((reply) => (
                <CommentItem
                  key={reply._id}
                  comment={reply}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  onDelete={onDelete}
                  onReply={onReply}
                  depth={1}
                />
              ))}
            </div>
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
  readOnlyMode?: boolean; // teacher: can reply/delete but not post new top-level unless also enrolled
}

export default function CommentsAndRating({ courseId, lessonId, onCourseRatingUpdate, readOnlyMode }: CommentsProps) {
  const { user } = useAuth();
  const { comments, loading: commentsLoading, addComment, addReply, deleteComment } = useComments(courseId, lessonId);

  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-blue-500" />
        {lessonId ? 'Lesson Discussion' : 'Course Discussion'}
        {!commentsLoading && (
          <span className="ml-auto text-sm font-normal text-gray-400">
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </span>
        )}
      </h3>

      {/* Compose box — students can post top-level; teachers see info */}
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

      {isTeacher && (
        <div className="mb-4 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <p className="text-xs text-blue-700 font-medium">
            You can reply to student comments and delete inappropriate ones.
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
            />
          ))}
        </div>
      )}
    </div>
  );
}