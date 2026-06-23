import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeacherDashboard } from '../hooks/useTeacherDashboard';
import Navbar from '../components/Navbar';
import { useNavigation } from '../contexts/NavigationContext';
import {
  TrendingUp, Users, Video, AlertCircle,
  Download, Calendar, Clock, Brain, Plus, X, Trash2,
  Search, ChevronLeft, ChevronRight, Lock , 
  Loader2, Lightbulb, AlertTriangle, Sparkles, BookOpen, Smile,
} from 'lucide-react';
import { useTeacherEmotionAnalytics } from '../hooks/useTeacherEmotionAnalytics';

interface TeacherDashboardProps {
  onOpenCourse: (id: string, title: string, type: 'live' | 'recorded') => void;
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

const SIGNAL_META: Record<'positive' | 'neutral' | 'struggling' | 'disengaged', { label: string; color: string }> = {
  positive:   { label: 'Engaged',    color: '#3B9122' },
  neutral:    { label: 'Following',  color: '#9CA3AF' },
  struggling: { label: 'Struggling', color: '#3B82F6' },
  disengaged: { label: 'Disengaged', color: '#E24B4A' },
};

export default function TeacherDashboard({ onOpenCourse }: TeacherDashboardProps) {
  const { user } = useAuth();
  const {
    data, loading, error,
    createCourse, deleteCourse, togglePublish,
    search, setSearch,
    typeFilter, setTypeFilter,
    sortBy, setSortBy,
    page, setPage,
  } = useTeacherDashboard();

  const { courses, totalStudents, averageEngagement, totalPages } = data;
  const { data: analytics, loading: analyticsLoading } = useTeacherEmotionAnalytics();
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { setCurrentPage } = useNavigation();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    course_type: 'recorded' as 'live' | 'recorded',
    duration_hours: 1,
    scheduledAt: '',
  });

  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await createCourse({
        ...form,
        duration_hours: Number(form.duration_hours),
        scheduledAt: form.course_type === 'live' ? form.scheduledAt : undefined,
      });
      setShowModal(false);
      setForm({ title: '', description: '', course_type: 'recorded', duration_hours: 1, scheduledAt: '' });
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to create course.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteCourse(confirmDelete.id);
      setConfirmDelete(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8">
            <div className="flex items-center justify-center w-14 h-14 bg-red-100 rounded-full mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Course?</h2>
            <p className="text-gray-600 text-center text-sm mb-1">You are about to delete</p>
            <p className="text-center font-semibold text-gray-900 mb-4">"{confirmDelete.title}"</p>
            <p className="text-red-500 text-xs text-center mb-6">
              This will permanently delete all lessons and uploaded files. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCourse}
                disabled={deleting}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Course</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Introduction to Python"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Short description of the course"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Type</label>
                <select
                  name="course_type"
                  value={form.course_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="recorded">Recorded</option>
                  <option value="live">Live</option>
                </select>
              </div>
              
              {form.course_type === 'live' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="scheduledAt"
                    value={form.scheduledAt}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              {formError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {formError}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Creating...' : 'Create Course'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI Recommendations modal */}
      {showRecommendations && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold">AI Recommendations</h3>
              </div>
              <button onClick={() => setShowRecommendations(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Analyzing emotion data…
                </div>
              ) : !analytics?.recommendations.length ? (
                <div className="text-center py-10">
                  <Lightbulb className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    No recommendations right now. Once enough emotion data is collected,
                    targeted suggestions will appear here.
                  </p>
                </div>
              ) : (
                analytics.recommendations.map((r) => {
                  const sev =
                    r.severity === 'high'
                      ? { cls: 'border-red-200 bg-red-50', dot: 'bg-red-500', text: 'text-red-700' }
                      : r.severity === 'medium'
                      ? { cls: 'border-amber-200 bg-amber-50', dot: 'bg-amber-500', text: 'text-amber-700' }
                      : { cls: 'border-green-200 bg-green-50', dot: 'bg-green-500', text: 'text-green-700' };
                  return (
                    <div key={r.id} className={`rounded-xl border p-4 ${sev.cls}`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${sev.text}`}>
                          {r.severity} priority
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm mb-1">{r.title}</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{r.message}</p>
                      {r.courseId && (
                        <button
                          onClick={() => {
                            setShowRecommendations(false);
                            onOpenCourse(r.courseId!, r.courseTitle || 'Course', r.courseType || 'recorded');
                          }}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          <BookOpen className="w-3.5 h-3.5" /> Open course
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Teacher Dashboard</h1>
            <p className="text-gray-600">Overview of your courses and student analytics</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" /> New Course
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <Video className="w-6 h-6 text-blue-600 mb-4" />
            <p className="text-2xl font-bold">{data.total ?? courses.length}</p>
            <p className="text-sm text-gray-600">Total Courses</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <Users className="w-6 h-6 text-green-600 mb-4" />
            <p className="text-2xl font-bold">{totalStudents}</p>
            <p className="text-sm text-gray-600">Total Students</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <TrendingUp className="w-6 h-6 text-purple-600 mb-4" />
            <p className="text-2xl font-bold">{Math.round(averageEngagement * 100)}%</p>
            <p className="text-sm text-gray-600">Avg Engagement</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <AlertCircle className="w-6 h-6 text-orange-600 mb-4" />
            <p className="text-2xl font-bold">{analytics?.activeAlerts ?? 0}</p>
            <p className="text-sm text-gray-600">Active Alerts</p>
          </div>
        </div>

        {/* Main */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">My Courses</h2>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-4 h-4" /> Add Course
                </button>
              </div>

              {/* Search & Filter & Sort */}
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search courses..."
                    className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
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
                      onClick={() => setTypeFilter(t)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                        typeFilter === t
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      {t === 'all' ? 'All' : t === 'live' ? '🔴 Live' : '▶ Recorded'}
                    </button>
                  ))}
                </div>
                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer"
                >
                  <option value="newest">📅 Newest first</option>
                  <option value="oldest">📅 Oldest first</option>
                  <option value="most_enrolled">👥 Most enrolled</option>
                  <option value="least_enrolled">👥 Least enrolled</option>
                </select>
              </div>

              {/* Course list */}
              {courses.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  {search || typeFilter !== 'all' ? (
                    <p className="text-gray-500">No courses match your filters.</p>
                  ) : (
                    <>
                      <p className="text-gray-500 mb-4">No courses yet. Create your first one!</p>
                      <button
                        onClick={() => setShowModal(true)}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      >
                        Create Course
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {courses.map((course) => (
                      <div
                        key={course._id}
                        onClick={() => onOpenCourse(String(course._id), course.title, course.type)}
                        className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                              course.type === 'live'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-blue-100 text-blue-600'
                            }`}>
                              {course.type === 'live' ? '🔴 Live' : '▶ Recorded'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Users className="w-3 h-3" />
                            <span>{course.enrollmentCount} student{course.enrollmentCount !== 1 ? 's' : ''} enrolled</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{course.description}</p>
                          <div className="flex gap-4 text-xs text-gray-500 mt-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />{formatHours(course.duration)}
                            </span>
                            {course.createdAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Posted {new Date(course.createdAt).toLocaleDateString()}
                              </span>
                            )}
                            {course.scheduledAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Scheduled {new Date(course.scheduledAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePublish(String(course._id)); }}
                            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                              course.is_published
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700'
                            }`}
                          >
                            {course.is_published ? '✓ Published' : 'Publish'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: String(course._id), title: course.title }); }}
                            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                            p === page
                              ? 'bg-blue-600 text-white'
                              : 'border border-gray-300 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {p}
                        </button>
                      ))}

                      <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Emotional Analytics */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">Emotional Analytics</h2>
                  <p className="text-gray-500 text-sm">
                    Aggregated from AI emotion detection across your courses
                  </p>
                </div>
                <Brain className="w-6 h-6 text-blue-600" />
              </div>

              {analyticsLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading analytics…
                </div>
              ) : !analytics?.hasData ? (
                <div className="text-center py-10">
                  <Smile className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    No emotion data yet. Analytics appear once enrolled students
                    watch lessons with emotion detection enabled.
                  </p>
                </div>
              ) : (
                (() => {
                  const sc = analytics.overview.signalCounts;
                  const total = (Object.values(sc) as number[]).reduce((a, b) => a + b, 0) || 1;
                  return (
                    <>
                      <div className="flex items-end gap-6 mb-5">
                        <div>
                          <p className="text-3xl font-bold text-gray-900">
                            {analytics.overview.engagementScore}%
                          </p>
                          <p className="text-xs text-gray-500">Positive engagement</p>
                        </div>
                        <div className="text-sm text-gray-500 pb-1">
                          <span className="font-medium text-gray-700">
                            {analytics.overview.totalDetections.toLocaleString()}
                          </span>{' '}detections ·{' '}
                          <span className="font-medium text-gray-700">
                            {analytics.overview.studentsTracked}
                          </span>{' '}
                          {analytics.overview.studentsTracked === 1 ? 'student' : 'students'}
                        </div>
                      </div>

                      {/* Stacked signal bar */}
                      <div className="flex h-3 w-full overflow-hidden rounded-full mb-3">
                        {(Object.keys(SIGNAL_META) as (keyof typeof SIGNAL_META)[]).map((k) => {
                          const pct = (sc[k] / total) * 100;
                          return pct > 0 ? (
                            <div
                              key={k}
                              style={{ width: `${pct}%`, backgroundColor: SIGNAL_META[k].color }}
                              title={`${SIGNAL_META[k].label}: ${Math.round(pct)}%`}
                            />
                          ) : null;
                        })}
                      </div>

                      {/* Legend */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                        {(Object.keys(SIGNAL_META) as (keyof typeof SIGNAL_META)[]).map((k) => (
                          <div key={k} className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SIGNAL_META[k].color }} />
                            <span className="text-gray-600">{SIGNAL_META[k].label}</span>
                            <span className="text-gray-400">{Math.round((sc[k] / total) * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-6">
            {/* Problematic Lessons */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Problematic Lessons</h2>
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>

              {analyticsLoading ? (
                <div className="flex items-center justify-center py-6 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
                </div>
              ) : !analytics?.problematicLessons.length ? (
                <p className="text-sm text-gray-500">
                  No problem lessons detected — students are coping well. 👍
                </p>
              ) : (
                <div className="space-y-3">
                  {analytics.problematicLessons.map((l) => {
                    const issue =
                      l.dominantIssue === 'frustration'
                        ? { label: 'Frustration', cls: 'text-orange-700 bg-orange-100', bar: '#E8762E', pct: l.frustrationPct }
                        : { label: 'Difficulty', cls: 'text-purple-700 bg-purple-100', bar: '#7F77DD', pct: l.difficultyPct };
                    return (
                      <button
                        key={l.lessonId}
                        onClick={() => l.courseId && onOpenCourse(l.courseId, l.courseTitle, l.courseType)}
                        className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">{l.lessonTitle}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${issue.cls}`}>
                            {issue.label} {issue.pct}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 line-clamp-1 mb-2">{l.courseTitle}</p>
                        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, issue.pct)}%`, backgroundColor: issue.bar }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowRecommendations(true)}
                  className="w-full flex items-center justify-between gap-2 p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Brain className="w-4 h-4" /> AI Recommendations
                  </span>
                  {!!analytics?.recommendations.length && (
                    <span className="text-xs font-bold bg-white/30 rounded-full px-2 py-0.5">
                      {analytics.recommendations.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full flex items-center gap-2 p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
                >
                  <Calendar className="w-4 h-4" /> Schedule Session
                </button>
                <button
                  
                  onClick={() => setCurrentPage('private-rooms')}
                  className="w-full flex items-center gap-2 p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
                ><Lock className="w-4 h-4" />Private Rooms
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}