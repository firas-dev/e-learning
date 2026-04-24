import { Search, X, Loader2, BookOpen, Video, Play, Users, Clock, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAdminCourses, AdminCourse } from "../../../hooks/useAdmin";
import Pagination from "../common/Pagination";
import DeleteConfirmModal from "../modals/DeleteConfirmModal";

export default function CoursesTab() {
    const {
      courses, total, totalPages, loading, actionLoading,
      search, setSearch, typeFilter, setTypeFilter,
      statusFilter, setStatusFilter, sortBy, setSortBy,
      page, setPage, togglePublish, deleteCourse,
    } = useAdminCourses();
  
    const [deleteTarget, setDeleteTarget] = useState<AdminCourse | null>(null);
    const [deleting, setDeleting] = useState(false);
  
    const handleDelete = async () => {
      if (!deleteTarget) return;
      setDeleting(true);
      try {
        await deleteCourse(deleteTarget._id);
        setDeleteTarget(null);
      } catch (e) { console.error(e); }
      finally { setDeleting(false); }
    };
  
    return (
      <div>
        {deleteTarget && (
          <DeleteConfirmModal
            title="Delete Course?"
            description={`This will permanently delete "${deleteTarget.title}", all its lessons and files. This cannot be undone.`}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
            loading={deleting}
          />
        )}
  
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses…"
              className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="all">All types</option>
            <option value="recorded">Recorded</option>
            <option value="live">Live</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="all">All status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title_asc">Title A→Z</option>
            <option value="title_desc">Title Z→A</option>
          </select>
        </div>
  
        <p className="text-sm text-gray-500 mb-3">{total} course{total !== 1 ? 's' : ''} found</p>
  
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No courses match your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => {
              const isLoading = actionLoading === course._id;
              return (
                <div
                  key={course._id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      course.type === 'live'
                        ? 'bg-gradient-to-br from-red-500 to-orange-500'
                        : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                    }`}>
                      {course.type === 'live'
                        ? <Video className="w-7 h-7 text-white" />
                        : <Play className="w-7 h-7 text-white" />}
                    </div>
  
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-gray-900">{course.title}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            by {course.teacherId?.fullName || 'Unknown'} · {course.teacherId?.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            course.is_published
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {course.is_published ? '✓ Published' : 'Draft'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            course.type === 'live'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-blue-100 text-blue-600'
                          }`}>
                            {course.type === 'live' ? '🔴 Live' : '▶ Recorded'}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">{course.description}</p>
  
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Users className="w-3 h-3" /> {course.enrollmentCount} enrolled
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {course.lessonCount} lessons
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {course.duration}h
                        </span>
                        {course.avgRating > 0 && (
                          <span className="text-xs text-yellow-600 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400" /> {course.avgRating}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          Created {new Date(course.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
  
                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => togglePublish(course._id)}
                        disabled={isLoading}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          course.is_published
                            ? 'bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                        } disabled:opacity-50`}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : course.is_published ? (
                          'Unpublish'
                        ) : (
                          'Publish'
                        )}
                      </button>
                      <button
                        onClick={() => setDeleteTarget(course)}
                        className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Delete course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
  
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    );
  }