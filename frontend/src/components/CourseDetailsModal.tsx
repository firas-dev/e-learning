import { useEffect } from 'react';
import { useCourseDetails } from '../hooks/useCourseDetails';
import {
  X, Clock, Users, User, Calendar, BookOpen,
  Loader2, CheckCircle, ExternalLink,
} from 'lucide-react';
import StarBadge from './StarBadge';

interface CourseDetailsModalProps {
  courseId: string;
  isEnrolled: boolean;
  working: boolean;                 // true while this course's enroll/unenroll is in flight
  onEnroll: () => void;
  onUnenroll: () => void;
  onClose: () => void;
  onViewTeacherProfile?: (teacherId: string) => void;
}

// Format a duration stored in hours (float) as e.g. "1h08m" or "45m"
function formatHours(totalHours: number): string {
  if (!totalHours || totalHours <= 0) return '0m';
  const totalMins = Math.round(totalHours * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}m`;
}

export default function CourseDetailsModal({
  courseId, isEnrolled, working, onEnroll, onUnenroll, onClose, onViewTeacherProfile,
}: CourseDetailsModalProps) {
  const { course, loading } = useCourseDetails(courseId);

  // Close on Escape + lock background scroll while open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div className="sticky top-0 flex justify-end p-3 bg-white/80 backdrop-blur-sm">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {loading || !course ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="px-6 pb-6 -mt-2">
            {/* Type badge + title */}
            <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium mb-3 ${
              course.type === 'live' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {course.type === 'live' ? '🔴 Live' : '▶ Recorded'}
            </span>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h2>
            {course.description && (
              <p className="text-gray-600 leading-relaxed mb-5">{course.description}</p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {formatHours(course.duration)}
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                {course.lessonCount} lesson{course.lessonCount !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {course.enrollmentCount} student{course.enrollmentCount !== 1 ? 's' : ''}
              </span>
              <StarBadge average={course.averageRating} />
              {course.scheduledAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(course.scheduledAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Publisher */}
            <div className="text-sm text-gray-500 mb-6">
              <span className="mr-1">Published by</span>
              {onViewTeacherProfile && course.teacherId ? (
                <button
                  onClick={() => onViewTeacherProfile(String(course.teacherId._id))}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
                >
                  <User className="w-4 h-4" />
                  {course.teacherId.fullName || 'Teacher'}
                  <ExternalLink className="w-3 h-3" />
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-gray-700">
                  <User className="w-4 h-4" />
                  {course.teacherId?.fullName || 'Teacher'}
                </span>
              )}
            </div>

            {/* Lessons */}
            <div className="border-t border-gray-100 pt-5 mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Lessons ({course.lessonCount})
              </h3>
              {course.lessons.length === 0 ? (
                <p className="text-sm text-gray-400">No lessons published yet.</p>
              ) : (
                <ol className="space-y-2">
                  {course.lessons.map((lesson, i) => (
                    <li
                      key={lesson._id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/60"
                    >
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-800">{lesson.title}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Enroll / Unenroll */}
            {isEnrolled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  You are enrolled in this course
                </div>
                <button
                  onClick={onUnenroll}
                  disabled={working}
                  className="w-full py-3 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {working && <Loader2 className="w-4 h-4 animate-spin" />}
                  {working ? 'Processing...' : 'Unenroll'}
                </button>
              </div>
            ) : (
              <button
                onClick={onEnroll}
                disabled={working}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {working && <Loader2 className="w-4 h-4 animate-spin" />}
                {working ? 'Enrolling...' : 'Enroll in this course'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}