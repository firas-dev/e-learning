import StatCard from "../common/StatCard";
import MiniBarChart from "../common/MiniBarChart";
import { Loader2, Users, BookOpen, GraduationCap, Clock, Shield, UserX } from "lucide-react";
import { useAdminStats } from "../../../hooks/useAdmin";

export default function AnalyticsTab() {
    const { stats, loading, error } = useAdminStats();
  
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        </div>
      );
    }
  
    if (error || !stats) {
      return <p className="text-red-500 text-center py-12">{error || 'Failed to load stats'}</p>;
    }
  
    return (
      <div className="space-y-6">
        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Users" value={stats.users.total} sub={`+${stats.users.newLast30Days} this month`} color="bg-indigo-500" />
          <StatCard icon={BookOpen} label="Total Courses" value={stats.courses.total} sub={`${stats.courses.published} published`} color="bg-blue-500" />
          <StatCard icon={GraduationCap} label="Enrollments" value={stats.enrollments.total} sub={`+${stats.enrollments.newLast30Days} this month`} color="bg-emerald-500" />
          <StatCard icon={Clock} label="Learning Hours" value={`${stats.enrollments.totalLearningHours}h`} sub={`${stats.enrollments.avgProgress}% avg progress`} color="bg-orange-500" />
        </div>
  
        {/* User breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4">User Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: 'Students', count: stats.users.students, color: 'bg-blue-500', icon: GraduationCap },
                { label: 'Teachers', count: stats.users.teachers, color: 'bg-purple-500', icon: Users },
                { label: 'Admins', count: stats.users.admins, color: 'bg-gray-500', icon: Shield },
                { label: 'Banned', count: stats.users.banned, color: 'bg-red-500', icon: UserX },
              ].map(({ label, count, color, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{label}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full`}
                        style={{ width: `${stats.users.total > 0 ? (count / stats.users.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
  
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4">Course Status</h3>
            <div className="space-y-3">
              {[
                { label: 'Published', count: stats.courses.published, color: 'bg-green-500' },
                { label: 'Draft', count: stats.courses.draft, color: 'bg-yellow-400' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{label}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full`}
                        style={{ width: `${stats.courses.total > 0 ? (count / stats.courses.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100 grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">{stats.content.lessons}</p>
                  <p className="text-xs text-gray-500">Lessons</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">{stats.content.ratings}</p>
                  <p className="text-xs text-gray-500">Ratings</p>
                </div>
                <div className="p-2 bg-gray-50 rounded-lg">
                  <p className="text-lg font-bold text-gray-900">{stats.content.comments}</p>
                  <p className="text-xs text-gray-500">Comments</p>
                </div>
              </div>
            </div>
          </div>
  
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-1">Platform Health</h3>
            <p className="text-xs text-gray-400 mb-4">Key operational metrics</p>
            <div className="space-y-3">
              {[
                { label: 'Publish rate', value: stats.courses.total > 0 ? `${Math.round((stats.courses.published / stats.courses.total) * 100)}%` : '—', color: 'text-green-600' },
                { label: 'Avg completion', value: `${stats.enrollments.avgProgress}%`, color: 'text-blue-600' },
                { label: 'Banned users', value: `${stats.users.total > 0 ? ((stats.users.banned / stats.users.total) * 100).toFixed(1) : 0}%`, color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600">{label}</span>
                  <span className={`text-sm font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
  
        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-1">New Users</h3>
            <p className="text-xs text-gray-400 mb-4">Last 7 months</p>
            <MiniBarChart data={stats.charts.userGrowth} color="bg-indigo-500" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-1">New Enrollments</h3>
            <p className="text-xs text-gray-400 mb-4">Last 7 months</p>
            <MiniBarChart data={stats.charts.enrollmentGrowth} color="bg-emerald-500" />
          </div>
        </div>
      </div>
    );
  }