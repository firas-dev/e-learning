import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useStudentDashboard } from '../hooks/useStudentDashboard';
import Navbar from '../components/Navbar';
import EmotionIndicator from '../components/EmotionIndicator';
import {
  BookOpen, Video, Calendar, TrendingUp,
  Clock, Brain, Play, ExternalLink,
  Search, X, ChevronLeft, ChevronRight,
} from 'lucide-react';

interface StudentDashboardProps {
  onOpenCourse: (id: string, title: string, type: 'live' | 'recorded') => void;
}

// ── Live badge ──
function LiveBadge({ scheduledAt, duration }: { scheduledAt?: string; duration: number }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [status, setStatus] = useState<'upcoming' | 'live' | 'ended'>('upcoming');

  useEffect(() => {
    if (!scheduledAt) return;

    const calc = () => {
      const now = Date.now();
      const start = new Date(scheduledAt).getTime();
      const end = start + duration * 60 * 60 * 1000;
      const diff = start - now;

      if (now >= end) { setStatus('ended'); setTimeLeft(''); return; }
      if (now >= start) { setStatus('live'); setTimeLeft(''); return; }

      setStatus('upcoming');
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) setTimeLeft(`in ${days}d ${hours}h`);
      else if (hours > 0) setTimeLeft(`in ${hours}h ${minutes}m`);
      else setTimeLeft(`in ${minutes}m`);
    };

    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [scheduledAt, duration]);

  if (status === 'ended') {
    return (
      <div className="text-right">
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-medium">
          ✓ Session ended
        </span>
      </div>
    );
  }

  if (status === 'live') {
    return (
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <span className="text-xs font-bold text-red-600">LIVE NOW</span>
      </div>
    );
  }

  return (
    <div className="text-right">
      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
        🔴 Live
      </span>
      {timeLeft && (
        <p className="text-xs text-gray-500 mt-1 font-medium">{timeLeft}</p>
      )}
    </div>
  );
}

// ── Session card with countdown ──
function SessionCard({
  session,
  onJoin,
}: {
  session: { id: string; title: string; scheduledAt: string; courseId: string; duration: number };
  onJoin: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState('');
  const [status, setStatus] = useState<'upcoming' | 'live' | 'ended'>('upcoming');

  useEffect(() => {
    const calc = () => {
      const now = Date.now();
      const start = new Date(session.scheduledAt).getTime();
      const end = start + session.duration * 60 * 60 * 1000;
      const diff = start - now;

      if (now >= end) { setStatus('ended'); setTimeLeft(''); return; }
      if (now >= start) { setStatus('live'); setTimeLeft(''); return; }

      setStatus('upcoming');
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      else setTimeLeft(`${minutes}m ${seconds}s`);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [session.scheduledAt, session.duration]);

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
      <h3 className="font-medium text-gray-900 mb-2">{session.title}</h3>

      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <Clock className="w-4 h-4" />
        {new Date(session.scheduledAt).toLocaleString()}
      </div>

      {status === 'ended' && (
        <div className="bg-gray-100 rounded-lg px-3 py-2 mb-3">
          <p className="text-sm text-gray-500 font-medium">✓ Session has ended</p>
        </div>
      )}
      {status === 'live' && (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-red-600">Live now!</span>
        </div>
      )}
      {status === 'upcoming' && (
        <div className="bg-blue-50 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-blue-500 font-medium mb-0.5">Starts in</p>
          <p className="text-base font-bold text-blue-700 tabular-nums">{timeLeft}</p>
        </div>
      )}

      <button
        onClick={onJoin}
        disabled={status !== 'live'}
        className={`w-full px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
          status === 'live'
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        <ExternalLink className="w-4 h-4" />
        {status === 'live' ? 'Join Now' : status === 'ended' ? 'Session Ended' : 'Not started yet'}
      </button>
    </div>
  );
}

// ── Main Dashboard ──
export default function StudentDashboard({ onOpenCourse }: StudentDashboardProps) {
  const { user } = useAuth();
  const { setCurrentPage } = useNavigation();
  const { data, loading, error } = useStudentDashboard();

  // ── My Courses filter / search / pagination ──
  const [courseSearch, setCourseSearch] = useState('');
  const [courseTypeFilter, setCourseTypeFilter] = useState<'all' | 'live' | 'recorded'>('all');
  const [coursePage, setCoursePage] = useState(1);
  const COURSES_PER_PAGE = 4;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const { enrollments, stats, upcomingSessions } = data!;

  const filteredEnrollments = enrollments.filter((e) => {
    const matchesSearch =
      e.course.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
      (e.course.description?.toLowerCase() ?? '').includes(courseSearch.toLowerCase());
    const matchesType =
      courseTypeFilter === 'all' || e.course.type === courseTypeFilter;
    return matchesSearch && matchesType;
  });

  const totalCoursePages = Math.ceil(filteredEnrollments.length / COURSES_PER_PAGE);
  const paginatedEnrollments = filteredEnrollments.slice(
    (coursePage - 1) * COURSES_PER_PAGE,
    coursePage * COURSES_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.fullName?.split(' ')[0] ?? 'Student'}!
          </h1>
          <p className="text-gray-600">Ready to continue your learning journey?</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
            <p className="text-sm text-gray-600">Enrolled Courses</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.avgProgress}%</p>
            <p className="text-sm text-gray-600">Avg Progress</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalLearningTime}h</p>
            <p className="text-sm text-gray-600">Learning Time</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex items-center gap-2">
              <EmotionIndicator emotion="engaged" size="sm" />
              <p className="text-sm text-gray-600">Engaged</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">Dominant Emotion</p>
          </div>
        </div>

        {/* Courses & Side Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">My Courses</h2>
                <button
                  onClick={() => setCurrentPage('catalog')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Browse Courses
                </button>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={(e) => { setCourseSearch(e.target.value); setCoursePage(1); }}
                    placeholder="Search my courses..."
                    className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {courseSearch && (
                    <button
                      onClick={() => { setCourseSearch(''); setCoursePage(1); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
                <div className="flex gap-1">
                  {(['all', 'recorded', 'live'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setCourseTypeFilter(t); setCoursePage(1); }}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                        courseTypeFilter === t
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      {t === 'all' ? 'All' : t === 'live' ? '🔴 Live' : '▶ Recorded'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enrollment list */}
              {enrollments.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  You are not enrolled in any courses yet.
                </p>
              ) : filteredEnrollments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No courses match your search.</p>
                  <button
                    onClick={() => { setCourseSearch(''); setCourseTypeFilter('all'); }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {paginatedEnrollments.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        onClick={() =>
                          onOpenCourse(
                            String(enrollment.course._id),
                            enrollment.course.title,
                            enrollment.course.type
                          )
                        }
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        {/* Thumbnail */}
                        <div className={`w-20 h-20 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          enrollment.course.type === 'live'
                            ? 'bg-gradient-to-br from-red-500 to-orange-500'
                            : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                        }`}>
                          {enrollment.course.type === 'live'
                            ? <Video className="w-8 h-8 text-white" />
                            : <Play className="w-8 h-8 text-white" />
                          }
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {enrollment.course.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                            {enrollment.course.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {enrollment.course.duration}h
                            </span>
                            <span className="capitalize">{enrollment.course.type}</span>
                          </div>
                        </div>

                        {/* Right side */}
                        <div className="text-right flex-shrink-0">
                          {enrollment.course.type === 'live' ? (
                            <LiveBadge
                              scheduledAt={enrollment.course.scheduledAt}
                              duration={enrollment.course.duration}
                            />
                          ) : (
                            <>
                              <div className="text-2xl font-bold text-gray-900 mb-1">
                                {enrollment.progress}%
                              </div>
                              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full transition-all"
                                  style={{ width: `${enrollment.progress}%` }}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalCoursePages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => setCoursePage((p) => Math.max(1, p - 1))}
                        disabled={coursePage === 1}
                        className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>

                      {Array.from({ length: totalCoursePages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setCoursePage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                            p === coursePage
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        onClick={() => setCoursePage((p) => Math.min(totalCoursePages, p + 1))}
                        disabled={coursePage === totalCoursePages}
                        className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Upcoming Sessions */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Live Sessions</h2>
                <Calendar className="w-5 h-5 text-gray-400" />
              </div>

              {upcomingSessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No live sessions</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onJoin={() =>
                        onOpenCourse(String(session.courseId), session.title, 'live')
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}