import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useStudentProfile } from '../hooks/useProfile';
import Navbar from '../components/Navbar';
import EmotionIndicator from '../components/EmotionIndicator';
import EditProfileModal from '../components/EditProfileModal';
import {
  ArrowLeft, BookOpen, Clock, TrendingUp, CheckCircle,
  Mail, Calendar, Play, Video, Loader2, ChevronDown,
  ChevronUp, MessageSquare, Award, Heart, Zap, Brain,
  BarChart2, Pencil, Smile, Sun,
} from 'lucide-react';
import type { RawEmotion, LearningSignal } from '../utils/emotionMapping';
import { emotionHeatColor } from '../utils/emotionMapping';

const API = 'http://localhost:5000/api';

// ── Types for emotion summary returned by the backend ────────────────────────
interface EmotionDistEntry {
  emotion: RawEmotion;
  displayLabel: string; // student-safe label from server
  count: number;
  pct: number;
}

interface EmotionSummary {
  hasData: boolean;
  distribution: EmotionDistEntry[];
  weekSignals: Record<LearningSignal, number>;
  bestHour: number | null;
  totalDetections: number;
}

// ── Small hook: fetches emotion summary across ALL enrolled courses ───────────
function useEmotionSummary(enrollments: { id: string; course: { _id: string } | null }[]) {
  const [summary, setSummary] = useState<EmotionSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Aggregate across all enrolled courses — use the first course that has data
    // (you can later merge all courses; this covers the most common single-course case)
    const courseIds = enrollments
      .map((e) => e.course?._id)
      .filter(Boolean) as string[];

    if (courseIds.length === 0) return;

    setLoading(true);

    // Fetch summaries for all courses in parallel, then merge them
    Promise.all(
      courseIds.map((id) =>
        axios
          .get<EmotionSummary>(`${API}/student/courses/${id}/emotion-summary`)
          .then((r) => r.data)
          .catch(() => null)
      )
    ).then((results) => {
      const valid = results.filter((r) => r && r.hasData) as EmotionSummary[];
      if (valid.length === 0) {
        setSummary({ hasData: false, distribution: [], weekSignals: { positive: 0, neutral: 0, struggling: 0, disengaged: 0 }, bestHour: null, totalDetections: 0 });
        return;
      }

      // Merge all distributions by summing counts
      const merged: Record<string, EmotionDistEntry> = {};
      let totalDetections = 0;
      const weekSignals: Record<LearningSignal, number> = { positive: 0, neutral: 0, struggling: 0, disengaged: 0 };
      let bestHour: number | null = null;

      for (const s of valid) {
        totalDetections += s.totalDetections;
        if (s.bestHour !== null) bestHour = s.bestHour; // take last non-null
        (Object.keys(s.weekSignals) as LearningSignal[]).forEach(
          (k) => { weekSignals[k] += s.weekSignals[k]; }
        );
        for (const entry of s.distribution) {
          if (!merged[entry.emotion]) {
            merged[entry.emotion] = { ...entry };
          } else {
            merged[entry.emotion].count += entry.count;
          }
        }
      }

      // Recalculate percentages after merge
      const distribution = Object.values(merged)
        .map((e) => ({ ...e, pct: Math.round((e.count / totalDetections) * 100) }))
        .sort((a, b) => b.count - a.count);

      setSummary({ hasData: true, distribution, weekSignals, bestHour, totalDetections });
    }).finally(() => setLoading(false));
  }, [enrollments]);

  return { summary, loading };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatHour(h: number): string {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${suffix}`;
}

const SIGNAL_COLORS: Record<LearningSignal, { bg: string; text: string; label: string }> = {
  positive:   { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Going well'       },
  neutral:    { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Following along'  },
  struggling: { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Challenging'      },
  disengaged: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Low engagement'   },
};

// ─────────────────────────────────────────────────────────────────────────────

export default function StudentProfile() {
  const { user } = useAuth();
  const { setCurrentPage } = useNavigation();
  const { data, loading, error } = useStudentProfile(user?._id);
  const [showAllEnrollments, setShowAllEnrollments] = useState(false);
  const [activeTab, setActiveTab] = useState<'courses' | 'activity'>('courses');
  const [showEditModal, setShowEditModal] = useState(false);

  // Optimistic local updates after profile edit
  const [localName, setLocalName] = useState<string | null>(null);
  const [localEmail, setLocalEmail] = useState<string | null>(null);

  // Emotion summary (real data from API)
  const { summary: emotionSummary, loading: emotionLoading } = useEmotionSummary(
    data?.enrollments ?? []
  );

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

  const { student, enrollments, stats, recentComments } = data;

  const displayName  = localName  ?? student.fullName;
  const displayEmail = localEmail ?? student.email;

  const initials = displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'S';

  const joinedDate = new Date(student.createdAt).toLocaleDateString(undefined, {
    month: 'long', year: 'numeric',
  });

  const visibleEnrollments    = showAllEnrollments ? enrollments : enrollments.slice(0, 4);
  const completedEnrollments  = enrollments.filter((e) => e.progress === 100);
  const inProgressEnrollments = enrollments.filter((e) => e.progress > 0 && e.progress < 100);

  // ── Emotion badge checks (uses real summary data) ─────────────────────────
  const happyPct      = emotionSummary?.distribution.find((e) => e.emotion === 'happy')?.pct ?? 0;
  const posWeek       = emotionSummary?.weekSignals.positive ?? 0;
  const struggleWeek  = emotionSummary?.weekSignals.struggling ?? 0;
  const hasEmotionData = emotionSummary?.hasData ?? false;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {showEditModal && (
        <EditProfileModal
          onClose={() => setShowEditModal(false)}
          onSuccess={({ fullName, email }) => {
            setLocalName(fullName);
            setLocalEmail(email);
          }}
        />
      )}

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="flex items-center gap-2 text-teal-200 hover:text-white mb-6 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </button>

          <div className="flex items-start gap-6 flex-wrap">
            <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl font-bold text-white border-2 border-white/30 flex-shrink-0">
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-3xl font-bold">{displayName}</h1>
                <span className="bg-teal-400/20 text-teal-100 text-xs px-3 py-1 rounded-full border border-teal-300/30">
                  Student
                </span>
              </div>
              <p className="text-teal-200 text-sm mb-3">{displayEmail}</p>
              <div className="flex items-center gap-5 text-sm text-teal-200 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Joined {joinedDate}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {stats.totalLearningTime}h learning time
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0"
            >
              <Pencil className="w-4 h-4" /> Edit Profile
            </button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            {[
              { icon: BookOpen,     label: 'Enrolled',    value: stats.totalEnrolled     },
              { icon: CheckCircle,  label: 'Completed',   value: stats.completed         },
              { icon: TrendingUp,   label: 'Avg progress',value: `${stats.avgProgress}%` },
              { icon: Clock,        label: 'Hours learned',value:`${stats.totalLearningTime}h`},
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                <Icon className="w-5 h-5 text-teal-200 mb-2" />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-teal-200 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Contact */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Contact info</h2>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-teal-600" />
                </div>
                <span className="text-gray-700 truncate">{displayEmail}</span>
              </div>
            </div>

            {/* Learning progress */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Learning progress</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Overall</span>
                    <span className="font-semibold text-gray-900">{stats.avgProgress}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all"
                      style={{ width: `${stats.avgProgress}%` }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-700">{stats.completed}</p>
                    <p className="text-xs text-green-600">Done</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-700">{stats.inProgress}</p>
                    <p className="text-xs text-blue-600">Active</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-600">{stats.notStarted}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Emotion Insights (REAL DATA) ──────────────────────────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-500" /> Emotion insights
              </h2>
              <p className="text-xs text-gray-400 mb-4">How you feel during learning sessions</p>

              {emotionLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                </div>
              ) : !hasEmotionData ? (
                <div className="text-center py-6">
                  <Brain className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">
                    Emotion data will appear here once you start a lesson with camera enabled.
                  </p>
                </div>
              ) : (
                <>
                  {/* Emotion distribution bars */}
                  <div className="space-y-3 mb-5">
                    {emotionSummary!.distribution.slice(0, 5).map((entry) => (
                      <div key={entry.emotion} className="flex items-center gap-3">
                        <EmotionIndicator emotion={entry.emotion} size="sm" />
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            {/* Use student-safe displayLabel, never raw emotion name */}
                            <span className="text-gray-600">{entry.displayLabel}</span>
                            <span className="font-medium text-gray-900">{entry.pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${entry.pct}%`,
                                backgroundColor: emotionHeatColor[entry.emotion],
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Weekly signal summary */}
                  <div className="border-t border-gray-100 pt-4 mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">This week</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(SIGNAL_COLORS) as LearningSignal[]).map((signal) => {
                        const count = emotionSummary!.weekSignals[signal];
                        const s = SIGNAL_COLORS[signal];
                        return (
                          <div key={signal} className={`${s.bg} rounded-lg px-3 py-2 text-center`}>
                            <p className={`text-sm font-bold ${s.text}`}>{count}</p>
                            <p className={`text-xs ${s.text} opacity-80`}>{s.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Best learning time insight */}
                  {emotionSummary!.bestHour !== null && (
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                      <Sun className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      <p className="text-xs text-yellow-800">
                        You're most focused around{' '}
                        <span className="font-semibold">{formatHour(emotionSummary!.bestHour)}</span>
                        {' '}— that's your peak learning time.
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-300 mt-3 text-center">
                    Based on {emotionSummary!.totalDetections.toLocaleString()} detections
                  </p>
                </>
              )}
            </div>

            {/* Engagement stats */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-500" /> Engagement
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Comments posted</span>
                  <span className="font-semibold text-gray-900">{stats.totalCommentsPosted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lessons rated</span>
                  <span className="font-semibold text-gray-900">{stats.totalRatingsGiven}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Courses completed</span>
                  <span className="font-semibold text-green-600">{stats.completed}</span>
                </div>
              </div>
            </div>

            {/* Certificates */}
            {completedEnrollments.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" /> Certificates earned
                </h2>
                <div className="space-y-3">
                  {completedEnrollments.map((e) => e.course && (
                    <div key={e.id} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                      <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Award className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{e.course.title}</p>
                        <p className="text-xs text-yellow-700">
                          Completed {new Date(e.lastAccessed).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Main column ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-200">
                {(['courses', 'activity'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'text-teal-600 border-b-2 border-teal-500 bg-teal-50/50'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'courses' ? `Enrolled courses (${enrollments.length})` : 'Recent activity'}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Courses tab */}
                {activeTab === 'courses' && (
                  <>
                    {enrollments.length === 0 ? (
                      <div className="text-center py-12">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-3">Not enrolled in any courses yet.</p>
                        <button
                          onClick={() => setCurrentPage('catalog')}
                          className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                        >
                          Browse the catalog →
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4">
                          {visibleEnrollments.map((enrollment) => {
                            if (!enrollment.course) return null;
                            const isComplete = enrollment.progress === 100;
                            return (
                              <div
                                key={enrollment.id}
                                className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl hover:border-teal-200 hover:shadow-sm transition-all"
                              >
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                  enrollment.course.type === 'live'
                                    ? 'bg-gradient-to-br from-red-500 to-orange-500'
                                    : 'bg-gradient-to-br from-teal-500 to-cyan-500'
                                }`}>
                                  {enrollment.course.type === 'live'
                                    ? <Video className="w-7 h-7 text-white" />
                                    : <Play className="w-7 h-7 text-white" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 flex-wrap">
                                    <h3 className="font-semibold text-gray-900">{enrollment.course.title}</h3>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                      isComplete
                                        ? 'bg-green-100 text-green-700'
                                        : enrollment.progress > 0
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}>
                                      {isComplete ? '✓ Completed' : enrollment.progress > 0 ? 'In progress' : 'Not started'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                    <span className="capitalize">{enrollment.course.type}</span>
                                    <span>{enrollment.course.duration}h</span>
                                    <span>{enrollment.completedLessons.length} lessons done</span>
                                  </div>

                                  {enrollment.course.type === 'recorded' ? (
                                    <div className="mt-2">
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-500">Progress</span>
                                        <span className={`font-medium ${isComplete ? 'text-green-600' : 'text-teal-600'}`}>
                                          {enrollment.progress}%
                                        </span>
                                      </div>
                                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${isComplete ? 'bg-green-500' : 'bg-teal-500'}`}
                                          style={{ width: `${enrollment.progress}%` }}
                                        />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-2 text-xs text-orange-600 flex items-center gap-1">
                                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                      Live course
                                      {enrollment.course.scheduledAt && (
                                        <span className="text-gray-500 ml-1">
                                          · {new Date(enrollment.course.scheduledAt).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {enrollments.length > 4 && (
                          <button
                            onClick={() => setShowAllEnrollments(!showAllEnrollments)}
                            className="w-full mt-4 flex items-center justify-center gap-1 text-sm text-teal-600 hover:text-teal-700 py-2 border border-teal-100 rounded-lg hover:bg-teal-50 transition-colors"
                          >
                            {showAllEnrollments
                              ? <><ChevronUp className="w-4 h-4" /> Show less</>
                              : <><ChevronDown className="w-4 h-4" /> Show all {enrollments.length} courses</>
                            }
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}

                {/* Activity tab */}
                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    {recentComments.length === 0 && inProgressEnrollments.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No recent activity yet.</p>
                      </div>
                    ) : (
                      <>
                        {inProgressEnrollments.slice(0, 3).map((e) => e.course && (
                          <div key={e.id} className="flex items-start gap-3 p-3 bg-teal-50 rounded-lg border border-teal-100">
                            <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <TrendingUp className="w-4 h-4 text-teal-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-700">
                                <span className="font-medium text-gray-900">{e.progress}%</span> progress on{' '}
                                <span className="font-medium text-teal-700">{e.course.title}</span>
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Last accessed {new Date(e.lastAccessed).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}

                        {recentComments.map((comment) => (
                          <div key={comment._id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <MessageSquare className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm text-gray-700 line-clamp-2">
                                <span className="font-medium text-gray-900">Posted a comment: </span>
                                {comment.text}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(comment.createdAt).toLocaleDateString(undefined, {
                                  month: 'short', day: 'numeric', year: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Achievements (original + 4 new emotion badges) ───────── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-5">Achievements</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* ── Original achievements ─────────────────────────────── */}
                {stats.completed >= 1 && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-900">First completion</p>
                      <p className="text-xs text-green-700">Finished a full course</p>
                    </div>
                  </div>
                )}
                {stats.totalLearningTime >= 10 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-900">Dedicated learner</p>
                      <p className="text-xs text-blue-700">10+ hours learned</p>
                    </div>
                  </div>
                )}
                {stats.totalEnrolled >= 3 && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-purple-900">Curious mind</p>
                      <p className="text-xs text-purple-700">Enrolled in 3+ courses</p>
                    </div>
                  </div>
                )}
                {stats.totalRatingsGiven >= 1 && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Heart className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-yellow-900">Helpful reviewer</p>
                      <p className="text-xs text-yellow-700">Rated at least one lesson</p>
                    </div>
                  </div>
                )}
                {stats.avgProgress >= 80 && (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-orange-900">High achiever</p>
                      <p className="text-xs text-orange-700">80%+ average progress</p>
                    </div>
                  </div>
                )}

                {/* ── New emotion-driven badges (only shown if earned) ───── */}
                {hasEmotionData && happyPct >= 80 && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                      😊
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-yellow-900">Joy Learner</p>
                      <p className="text-xs text-yellow-700">80%+ happy during sessions</p>
                    </div>
                  </div>
                )}
                {hasEmotionData && struggleWeek > 0 && posWeek > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                      💪
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-indigo-900">Resilient</p>
                      <p className="text-xs text-indigo-700">Bounced back from a tough session</p>
                    </div>
                  </div>
                )}
                {hasEmotionData && stats.completed >= 1 && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                      🧠
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-purple-900">Fearless</p>
                      <p className="text-xs text-purple-700">Completed a lesson despite difficulty</p>
                    </div>
                  </div>
                )}
                {hasEmotionData && posWeek >= 10 && (
                  <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                    <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">
                      🔥
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-rose-900">Unstoppable</p>
                      <p className="text-xs text-rose-700">10+ positive signals this week</p>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {stats.completed === 0 && stats.totalEnrolled < 3 && stats.totalRatingsGiven === 0
                  && stats.totalLearningTime < 10 && !hasEmotionData && (
                  <div className="col-span-2 text-center py-6 text-gray-400 text-sm">
                    Keep learning to unlock achievements!
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}