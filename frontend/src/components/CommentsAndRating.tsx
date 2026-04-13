import { useState } from 'react';
import { Star, Send, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import { useComments } from '../hooks/useComments';
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

// ── Course-wide average badge — embed next to "About This Lesson" ────────
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
      {/* Big number */}
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

// ── Lesson rating widget — students rate the current lesson ──────────────
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
      {/* Interactive input */}
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

// ── Comments section ─────────────────────────────────────────────────────
interface CommentsProps {
  courseId: string;
  lessonId?: string;
  onCourseRatingUpdate?: (avg: number, cnt: number) => void;
}

export default function CommentsAndRating({ courseId, lessonId, onCourseRatingUpdate }: CommentsProps) {
  const { user } = useAuth();
  const { comments, loading: commentsLoading, addComment, deleteComment } = useComments(courseId, lessonId);

  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-blue-500" />
        {lessonId ? 'Lesson Comments' : 'Course Comments'}
        {!commentsLoading && (
          <span className="ml-auto text-sm font-normal text-gray-400">
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
          </span>
        )}
      </h3>

      {user?.role === 'student' && (
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

      {commentsLoading ? (
        <div className="flex items-center gap-2 text-gray-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading comments…
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No comments yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c._id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {c.studentName?.[0]?.toUpperCase() || 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900">{c.studentName}</span>
                  <span className="text-xs text-gray-400">{formatDate(c.createdAt)}</span>
                  {user && (c.studentId === user._id || user.role === 'admin') && (
                    <button
                      onClick={() => deleteComment(c._id)}
                      className="ml-auto p-1 text-gray-300 hover:text-red-400 transition-colors"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-line break-words">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}