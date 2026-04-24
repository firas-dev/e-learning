import { useEffect, useState } from "react";
import { BarChart2, Users, Zap, AlertTriangle, Loader2, TrendingUp } from "lucide-react";
import { useCompetition } from "../../hooks/useCompetition";

interface Props { roomId: string }

export default function AnalyticsDashboard({ roomId }: Props) {
  const { getAnalytics } = useCompetition(roomId);
  const [data, setData]   = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics().then(setData).finally(() => setLoading(false));
  }, [roomId]);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 text-violet-500 animate-spin" /></div>;
  if (!data) return <p className="text-center text-gray-400 py-8">No analytics available yet.</p>;

  return (
    <div className="space-y-5">
      {/* Top stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Users,     label: "Room members",      value: data.totalStudents,                  color: "text-blue-500" },
          { icon: Zap,       label: "Challenges",        value: data.totalChallenges,                color: "text-violet-500" },
          { icon: TrendingUp,label: "Active this week",   value: data.totalStudents - data.inactiveStudents, color: "text-green-500" },
          { icon: AlertTriangle, label: "Inactive 7d",   value: data.inactiveStudents,              color: "text-amber-500" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Top students */}
      {data.topStudents?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-violet-500" />Top Performers</h3>
          <div className="space-y-3">
            {data.topStudents.map((s: any, i: number) => (
              <div key={s.student?._id ?? i} className="flex items-center gap-3">
                <span className="w-6 text-center font-bold text-gray-400 text-sm">#{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {s.student?.fullName?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{s.student?.fullName}</p>
                  <p className="text-xs text-gray-400">Level {s.level}</p>
                </div>
                <span className="font-bold text-gray-900 tabular-nums text-sm">{s.totalPoints.toLocaleString()} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-challenge stats */}
      {data.challengeAnalytics?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-800 text-sm">Challenge Analytics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Challenge","Difficulty","Participation","Avg Score","Submissions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.challengeAnalytics.map((c: any) => (
                  <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 truncate max-w-[180px]">{c.title}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        c.difficulty === "easy"   ? "bg-emerald-100 text-emerald-700" :
                        c.difficulty === "medium" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>{c.difficulty}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${c.participationRate}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 tabular-nums">{c.participationRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 tabular-nums">{c.avgScore}</td>
                    <td className="px-4 py-3 text-gray-600 tabular-nums">{c.totalSubmissions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}