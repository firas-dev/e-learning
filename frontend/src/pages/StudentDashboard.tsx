import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useStudentDashboard } from '../hooks/useStudentDashboard';
import Navbar from '../components/Navbar';
import EmotionIndicator from '../components/EmotionIndicator';
import {
  BookOpen, Video, Calendar, TrendingUp,
  Clock, Brain, Play, ExternalLink,
  Search, X, ChevronLeft, ChevronRight, Users,
} from 'lucide-react';
import StarBadge from '../components/StarBadge';

interface StudentDashboardProps {
  onOpenCourse: (id: string, title: string, type: 'live' | 'recorded') => void;
}
function formatMinutes(totalMinutes: number): string {
  const t = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${h}h${m.toString().padStart(2, '0')}m`;
}
 
// ── Format a course duration stored in hours (float) as e.g. "1h30m" ──
function formatHours(totalHours: number): string {
  const totalMins = Math.round(totalHours * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h${m.toString().padStart(2, '0')}m`;
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
  const [progressFilter, setProgressFilter] = useState<'all' | 'not_started' | 'in_progress' | 'completed'>('all');
  const [courseSortBy, setCourseSortBy] = useState<'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'progress_high' | 'progress_low'>('newest');
  const [coursePage, setCoursePage] = useState(1);
  const [justCleared, setJustCleared] = useState(false);
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

  const filteredEnrollments = enrollments
    .filter((e) => {
      if (!e.course) return false;
      const matchesSearch =
        e.course.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
        (e.course.description?.toLowerCase() ?? '').includes(courseSearch.toLowerCase());
      const matchesType =
        courseTypeFilter === 'all' || e.course.type === courseTypeFilter;
      const matchesProgress =
        progressFilter === 'all' ||
        (e.course.type === 'live'
          ? false
          : progressFilter === 'not_started'  ? e.progress === 0
          : progressFilter === 'in_progress'  ? e.progress > 0 && e.progress < 100
          : progressFilter === 'completed'    ? e.progress === 100
          : true);
      return matchesSearch && matchesType && matchesProgress;
    })
    .sort((a, b) => {
      switch (courseSortBy) {
        case 'oldest':
          return new Date(a.course.createdAt ?? 0).getTime() - new Date(b.course.createdAt ?? 0).getTime();
        case 'rating_high':
          return (b.course.averageRating ?? 0) - (a.course.averageRating ?? 0);
        case 'rating_low':
          return (a.course.averageRating ?? 0) - (b.course.averageRating ?? 0);
        case 'progress_high':
          return b.progress - a.progress;
        case 'progress_low':
          return a.progress - b.progress;
        case 'newest':
        default:
          return new Date(b.course.createdAt ?? 0).getTime() - new Date(a.course.createdAt ?? 0).getTime();
      }
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
            <p className="text-2xl font-bold text-gray-900">{formatMinutes(stats.totalLearningTime)}</p>
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
                  onClick={() => setCurrentPage('private-rooms')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Private Rooms"
                >Private Rooms
                </button>
                <button
                  onClick={() => setCurrentPage('catalog')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Browse Courses
                </button>
              </div>

              {/* Filters */}
              <div className="mb-5 space-y-3">

                {/* Row 1 — Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={courseSearch}
                    onChange={(e) => { setCourseSearch(e.target.value); setCoursePage(1); }}
                    placeholder="Search courses..."
                    className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  />
                  {courseSearch && (
                    <button onClick={() => { setCourseSearch(''); setCoursePage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>

                {/* Row 2 — Filter groups + Clear */}
                <div className="flex flex-wrap items-center gap-3">

                  {/* Type */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</span>
                    <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                      {([
                        { value: 'all',      label: 'All'       },
                        { value: 'recorded', label: '▶ Recorded' },
                        { value: 'live',     label: '🔴 Live'   },
                      ] as const).map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => { setCourseTypeFilter(value); setCoursePage(1); }}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                            courseTypeFilter === value
                              ? 'bg-white text-blue-600 shadow-sm font-semibold'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="w-px h-5 bg-gray-200" />

                  {/* Progress */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">State</span>
                    <select
                      value={progressFilter}
                      onChange={(e) => { setProgressFilter(e.target.value as any); setCoursePage(1); }}
                      className="px-3 py-1.5 bg-gray-100 border-0 rounded-lg text-xs font-medium text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-gray-200 transition-colors"
                    >
                      <option value="all">All States</option>
                      <option value="not_started">⭕ Not started</option>
                      <option value="in_progress">🔄 In progress</option>
                      <option value="completed">✅ Completed</option>
                    </select>
                  </div>

                  <div className="w-px h-5 bg-gray-200" />

                  {/* Sort */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sort</span>
                    <div className="flex gap-1">
                      {([
                        { asc: 'oldest',       desc: 'newest',       label: 'Date'     },
                        { asc: 'rating_low',   desc: 'rating_high',  label: '★ Rating' },
                        { asc: 'progress_low', desc: 'progress_high', label: 'Progress' },
                      ] as const).map(({ asc, desc, label }) => {
                        const isActive = courseSortBy === asc || courseSortBy === desc;
                        const isAsc = courseSortBy === asc;
                        return (
                          <button
                            key={label}
                            onClick={() => {
                              setCourseSortBy(isActive ? (isAsc ? desc : asc) : desc);
                              setCoursePage(1);
                            }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                              isActive
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : justCleared
                                ? 'bg-white text-gray-500 border-gray-200'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                            }`}
                          >
                            {label}
                            <span>{isActive ? (isAsc ? '↑' : '↓') : '↕'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clear all — pushed to the right */}
                  <button
                    onClick={(e) => {
                      setCourseSearch('');
                      setCourseTypeFilter('all');
                      setProgressFilter('all');
                      setCourseSortBy('newest');
                      setCoursePage(1);
                      setJustCleared(true);
                      setTimeout(() => setJustCleared(false), 300);
                      (e.currentTarget as HTMLButtonElement).blur();
                    }}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear all
                  </button>
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
                    onClick={() => {
                      setCourseSearch('');
                      setCourseTypeFilter('all');
                      setProgressFilter('all');
                      setCourseSortBy('newest');
                    }}
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
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {enrollment.course.title}
                            </h3>
                            <StarBadge average={enrollment.course.averageRating} />
                          </div>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                            {enrollment.course.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatHours(enrollment.course.duration)}
                            </span>
                            <span className="capitalize">{enrollment.course.type}</span>
                            {enrollment.course.createdAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(enrollment.course.createdAt).toLocaleDateString()}
                              </span>
                            )}
                            {enrollment.course.enrollmentCount != null && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {enrollment.course.enrollmentCount} enrolled
                              </span>
                            )}
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