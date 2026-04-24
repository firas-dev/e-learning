import { useEffect, useState } from "react";
import { Trophy, Loader2, RefreshCw } from "lucide-react";
import { useCompetition, ILeaderboardEntry } from "../../hooks/useCompetition";
import LevelProgress from "./LevelProgress";

interface Props {
  roomId: string;
  currentUserId?: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function RoomLeaderboard({ roomId, currentUserId }: Props) {
  const { getRoomLeaderboard } = useCompetition(roomId);
  const [entries, setEntries] = useState<ILeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getRoomLeaderboard();
      setEntries(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [roomId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  const top3  = entries.slice(0, 3);
  const rest  = entries.slice(3);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          Room Leaderboard
        </h3>
        <button
          onClick={load}
          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No points yet — submit a challenge to appear here!</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="grid grid-cols-3 gap-3">
            {top3.map((e, i) => {
              const isMe = e.student._id === currentUserId;
              return (
                <div
                  key={e.student._id}
                  className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                    isMe ? "border-violet-400 bg-violet-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <span className="text-3xl mb-1">{MEDALS[i]}</span>
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-base mb-2">
                    {e.student.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-xs font-bold text-gray-900 text-center truncate w-full">
                    {isMe ? "You" : e.student.fullName}
                  </p>
                  <span className="text-xs text-violet-600 font-semibold mt-0.5">Lv.{e.level}</span>
                  <p className="text-sm font-bold text-gray-800 mt-1 tabular-nums">
                    {e.totalPoints.toLocaleString()}
                    <span className="text-xs font-normal text-gray-400 ml-0.5">pts</span>
                  </p>
                  {e.badges.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {e.badges.slice(0, 3).map((b) => (
                        <span key={b.id} title={b.name} className="text-sm">{b.icon}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rest of table */}
          {rest.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {rest.map((e) => {
                  const isMe = e.student._id === currentUserId;
                  return (
                    <div
                      key={e.student._id}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        isMe ? "bg-violet-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="w-7 text-center font-bold text-gray-400 text-sm tabular-nums">
                        #{e.rank}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-sm flex-shrink-0">
                        {e.student.fullName?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {isMe ? "You" : e.student.fullName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <LevelProgress points={e.totalPoints} level={e.level} compact />
                          {e.streak > 0 && (
                            <span className="text-xs text-orange-500 font-medium">🔥{e.streak}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {e.badges.slice(0, 3).map((b) => (
                          <span key={b.id} title={b.name} className="text-sm">{b.icon}</span>
                        ))}
                      </div>
                      <span className="font-bold text-gray-900 text-sm tabular-nums flex-shrink-0">
                        {e.totalPoints.toLocaleString()} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}