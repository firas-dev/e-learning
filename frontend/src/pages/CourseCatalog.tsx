import { useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useCatalog } from '../hooks/useCatalog';
import Navbar from '../components/Navbar';
import {
  Video, Play, Clock, Calendar, ArrowLeft,
  Loader2, CheckCircle, User, Users,
  Search, ChevronLeft, ChevronRight, X, ExternalLink,
} from 'lucide-react';
import StarBadge from '../components/StarBadge';

interface CourseCatalogProps {
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

export default function CourseCatalog({ onViewTeacherProfile }: CourseCatalogProps) {
  const { setCurrentPage } = useNavigation();
  const {
    courses, enrolledIds, loading, enrolling,
    enroll, unenroll,
    search, setSearch,
    typeFilter, setTypeFilter,
    page, setPage,
    totalPages, total,
  } = useCatalog();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Course Catalog</h1>
            <p className="text-gray-600">
              {total} course{total !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {(['all', 'recorded', 'live'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                  typeFilter === t
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                }`}
              >
                {t === 'all' ? 'All' : t === 'live' ? '🔴 Live' : '▶ Recorded'}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No courses found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter</p>
            <button
              onClick={() => { setSearch(''); setTypeFilter('all'); }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {courses.map((course) => {
                const isEnrolled = enrolledIds.includes(String(course._id));
                const isLoading = enrolling === String(course._id);

                return (
                  <div
                    key={course._id}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Card Header */}
                    <div className={`h-36 flex items-center justify-center ${
                      course.type === 'live'
                        ? 'bg-gradient-to-br from-red-500 to-orange-500'
                        : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                    }`}>
                      {course.type === 'live'
                        ? <Video className="w-16 h-16 text-white opacity-80" />
                        : <Play className="w-16 h-16 text-white opacity-80" />
                      }
                    </div>

                    <div className="p-5">
                      {/* Type badge */}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium mb-3 inline-block ${
                        course.type === 'live'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}>
                        {course.type === 'live' ? '🔴 Live' : '▶ Recorded'}
                      </span>

                      <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {course.description}
                      </p>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatHours(course.duration)}
                        </span>
                        {/* Teacher — clickable if onViewTeacherProfile is provided */}
                        {onViewTeacherProfile && course.teacherId ? (
                          <button
                            onClick={() => onViewTeacherProfile(String(course.teacherId._id))}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                          >
                            <User className="w-3 h-3" />
                            {course.teacherId.fullName || 'Teacher'}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        ) : (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {course.teacherId?.fullName || 'Teacher'}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {course.enrollmentCount} student{course.enrollmentCount !== 1 ? 's' : ''}
                        </span>
                        {course.scheduledAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(course.scheduledAt).toLocaleDateString()}
                          </span>
                        )}
                        <StarBadge average={course.averageRating} />
                      </div>

                      {/* Enroll / Unenroll */}
                      {isEnrolled ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            Enrolled
                          </div>
                          <button
                            onClick={() => unenroll(String(course._id))}
                            disabled={isLoading}
                            className="w-full py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isLoading ? 'Processing...' : 'Unenroll'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => enroll(String(course._id))}
                          disabled={isLoading}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                          {isLoading ? 'Enrolling...' : 'Enroll Now'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      p === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}