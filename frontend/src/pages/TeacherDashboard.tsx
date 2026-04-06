import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTeacherDashboard } from '../hooks/useTeacherDashboard';
import Navbar from '../components/Navbar';
import {
  TrendingUp, Users, Video, AlertCircle,
  Download, Calendar, Clock, Brain, Plus, X, Trash2,
} from 'lucide-react';

// ✅ type added to prop
interface TeacherDashboardProps {
  onOpenCourse: (id: string, title: string, type: 'live' | 'recorded') => void;
}

export default function TeacherDashboard({ onOpenCourse }: TeacherDashboardProps) {
  const { user } = useAuth();
  const {
    data, loading, error,
    createCourse, deleteCourse, togglePublish,
    search, setSearch,
    typeFilter, setTypeFilter,
    page, setPage,
  } = useTeacherDashboard();
  
  const { courses, totalStudents, averageEngagement, totalPages } = data;

  const [showModal, setShowModal] = useState(false);
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
                <input
                  type="number"
                  name="duration_hours"
                  value={form.duration_hours}
                  onChange={handleChange}
                  min={1}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
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
            <p className="text-2xl font-bold">{courses.length}</p>
            <p className="text-sm text-gray-600">Active Courses</p>
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
            <p className="text-2xl font-bold">3</p>
            <p className="text-sm text-gray-600">Active Alerts</p>
          </div>
        </div>

        {/* Main */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">My Courses</h2>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-4 h-4" /> Add Course
                </button>
              </div>

              {courses.length === 0 ? (
                <div className="text-center py-12">
                  <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No courses created yet</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    Create your first course
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {courses.map((course) => (
                    <div
                      key={course._id}
                      // ✅ passes type so App.tsx routes correctly
                      onClick={() => onOpenCourse(String(course._id), course.title, course.type)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{course.title}</h3>
                            {/* ✅ Visual badge showing course type */}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
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
                          <p className="text-sm text-gray-600 mt-1">{course.description}</p>
                          <div className="flex gap-4 text-xs text-gray-500 mt-3">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />{course.duration}h
                            </span>
                            {course.scheduledAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(course.scheduledAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePublish(String(course._id));
                            }}
                            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                              course.is_published
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-700'
                            }`}
                          >
                            {course.is_published ? '✓ Published' : 'Publish'}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete({ id: String(course._id), title: course.title });
                            }}
                            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-xl font-bold mb-2">Emotional Analytics</h2>
              <p className="text-gray-500 text-sm">Hook this later to analytics collection</p>
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-bold mb-4">Problematic Lessons</h2>
              <p className="text-sm text-gray-500">Will come from analytics later</p>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-2 p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium">
                  <Download className="w-4 h-4" /> Download Reports
                </button>
                <button className="w-full flex items-center gap-2 p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium">
                  <Brain className="w-4 h-4" /> AI Recommendations
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full flex items-center gap-2 p-3 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
                >
                  <Calendar className="w-4 h-4" /> Schedule Session
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}