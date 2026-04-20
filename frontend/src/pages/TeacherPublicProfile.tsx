import { useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useTeacherProfile } from '../hooks/useProfile';
import Navbar from '../components/Navbar';
import StarBadge from '../components/StarBadge';
import {
  ArrowLeft, BookOpen, Users, TrendingUp, Clock,
  Star, Mail, Calendar, CheckCircle,
  Video, Play, MessageSquare, Loader2, FileText,
  ChevronDown, ChevronUp, Award, Send,
} from 'lucide-react';

interface TeacherPublicProfileProps {
  teacherId: string;
  onStartConversation?: (teacherId: string) => void;
}

export default function TeacherPublicProfile({ teacherId, onStartConversation }: TeacherPublicProfileProps) {
  const { setCurrentPage } = useNavigation();
  const { data, loading, error } = useTeacherProfile(teacherId);
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <p className="text-red-500">{error || 'Profile not found.'}</p>
        </div>
      </div>
    );
  }

  const { teacher, courses, stats, recentComments } = data;

  const initials = teacher.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'T';

  const joinedDate = new Date(teacher.createdAt).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const publishedCourses = courses.filter((c) => c.is_published);
  const visibleCourses = showAllCourses ? publishedCourses : publishedCourses.slice(0, 4);
  const visibleReviews = showAllReviews ? recentComments : recentComments.slice(0, 3);

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="flex items-center gap-2 text-blue-200 hover:text-white mb-6 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex items-start gap-6 flex-wrap">
            <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold text-white border-2 border-white/30 flex-shrink-0">
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-3xl font-bold">{teacher.fullName}</h1>
                <span className="flex items-center gap-1 bg-green-400/20 text-green-200 text-xs px-3 py-1 rounded-full border border-green-300/30">
                  <CheckCircle className="w-3 h-3" /> Verified instructor
                </span>
              </div>
              <div className="flex items-center gap-5 text-sm text-blue-200 flex-wrap mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Joined {joinedDate}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-300 text-yellow-300" />
                  {stats.overallRating > 0
                    ? `${stats.overallRating} avg rating`
                    : 'No ratings yet'}
                  {stats.totalRatings > 0 && (
                    <span className="text-blue-300">({stats.totalRatings} reviews)</span>
                  )}
                </span>
              </div>
            </div>

            {/* Message button */}
            {onStartConversation && (
              <button
                onClick={() => onStartConversation(teacherId)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Send className="w-4 h-4" /> Message
              </button>
            )}
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            {[
              { icon: BookOpen, label: 'Courses', value: stats.publishedCourses },
              { icon: Users, label: 'Students', value: stats.totalStudents.toLocaleString() },
              { icon: TrendingUp, label: 'Avg completion', value: `${stats.avgCompletion}%` },
              { icon: Clock, label: 'Content hours', value: `${stats.totalLearningHours}h` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                <Icon className="w-5 h-5 text-blue-200 mb-2" />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-blue-200 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Contact</h2>
              <div className="flex items-center gap-3 text-sm mb-4">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700 truncate">{teacher.email}</span>
              </div>
              {onStartConversation && (
                <button
                  onClick={() => onStartConversation(teacherId)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Send className="w-4 h-4" /> Send message
                </button>
              )}
            </div>

            {/* Overall rating */}
            {stats.overallRating > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-4">Overall rating</h2>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-5xl font-bold text-gray-900">{stats.overallRating}</span>
                  <div>
                    <div className="flex gap-0.5">{renderStars(stats.overallRating)}</div>
                    <p className="text-sm text-gray-500 mt-1">
                      {stats.totalRatings} review{stats.totalRatings !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Achievements */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Achievements</h2>
              <div className="space-y-3">
                {stats.totalStudents >= 100 && (
                  <div className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg border border-yellow-100">
                    <Award className="w-6 h-6 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Popular instructor</p>
                      <p className="text-xs text-yellow-700">100+ students enrolled</p>
                    </div>
                  </div>
                )}
                {stats.totalCourses >= 3 && (
                  <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Prolific creator</p>
                      <p className="text-xs text-blue-700">3+ courses published</p>
                    </div>
                  </div>
                )}
                {stats.overallRating >= 4.5 && (
                  <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg border border-green-100">
                    <Star className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Top-rated</p>
                      <p className="text-xs text-green-700">4.5+ average rating</p>
                    </div>
                  </div>
                )}
                {stats.totalCourses === 0 && stats.overallRating < 4.5 && stats.totalStudents < 100 && (
                  <p className="text-sm text-gray-400 text-center py-2">No achievements yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Published courses */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gray-900">Courses</h2>
                <span className="text-sm text-gray-500">{publishedCourses.length} published</span>
              </div>

              {publishedCourses.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No published courses yet.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {visibleCourses.map((course) => (
                      <div
                        key={course._id}
                        className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl"
                      >
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
                          <h3 className="font-semibold text-gray-900">{course.title}</h3>
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{course.description}</p>
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Users className="w-3 h-3" /> {course.enrollmentCount} students
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <FileText className="w-3 h-3" /> {course.lessonCount} lessons
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" /> {course.duration}h
                            </span>
                            <StarBadge average={course.avgRating} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {publishedCourses.length > 4 && (
                    <button
                      onClick={() => setShowAllCourses(!showAllCourses)}
                      className="w-full mt-4 flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-700 py-2 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      {showAllCourses
                        ? <><ChevronUp className="w-4 h-4" /> Show less</>
                        : <><ChevronDown className="w-4 h-4" /> Show all {publishedCourses.length} courses</>
                      }
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Reviews */}
            {recentComments.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-gray-900">Student reviews</h2>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <MessageSquare className="w-4 h-4" />
                    {recentComments.length} recent
                  </div>
                </div>

                <div className="space-y-4">
                  {visibleReviews.map((comment) => {
                    const ini = comment.studentName
                      ?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'S';
                    return (
                      <div key={comment._id} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {ini}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900">{comment.studentName}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">{comment.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {recentComments.length > 3 && (
                  <button
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="w-full mt-4 flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-700 py-2 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    {showAllReviews
                      ? <><ChevronUp className="w-4 h-4" /> Show less</>
                      : <><ChevronDown className="w-4 h-4" /> Show all {recentComments.length} reviews</>
                    }
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}