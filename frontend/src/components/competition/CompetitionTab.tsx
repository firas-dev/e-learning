import { useState, useEffect } from "react";
import {
  Zap, Trophy, Award, BarChart2, Plus, Bell, Loader2,
  Megaphone, X, Trash2,
} from "lucide-react";
import { useCompetition, IChallenge } from "../../hooks/useCompetition";
import { useRoomSocket }  from "../../hooks/useRoomSocket";
import ChallengeCard      from "./ChallengeCard";
import ChallengeDetail    from "./ChallengeDetail";
import RoomLeaderboard    from "./RoomLeaderboard";
import AchievementsPanel  from "./AchievementsPanel";
import AnalyticsDashboard from "./AnalyticsDashboard";
import CreateChallengeModal from "./CreateChallengeModal";
import LevelProgress      from "./LevelProgress";

type SubTab = "challenges" | "leaderboard" | "achievements" | "analytics";

interface Props {
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  isTeacher: boolean;
}

export default function CompetitionTab({
  roomId, currentUserId, currentUserName, isTeacher,
}: Props) {
  const {
    challenges, announcements, myStats,
    loading, error, refetch,
    createChallenge, deleteChallenge,
    postAnnouncement, deleteAnnouncement,
  } = useCompetition(roomId);

  const { liveEvent } = useRoomSocket(roomId, currentUserId);

  const [subTab, setSubTab]                   = useState<SubTab>("challenges");
  const [selectedChallengeId, setSelected]    = useState<string | null>(null);
  const [showCreateModal, setShowCreate]      = useState(false);
  const [showAnnouncementForm, setShowAnnouncement] = useState(false);
  const [toast, setToast]                     = useState<string | null>(null);
  const [annTitle, setAnnTitle]               = useState("");
  const [annBody, setAnnBody]                 = useState("");
  const [annPinned, setAnnPinned]             = useState(false);
  const [postingAnn, setPostingAnn]           = useState(false);

  // Track which challenges the student has submitted
  const [submittedIds] = useState<Set<string>>(new Set());

  // React to live socket events
  useEffect(() => {
    if (!liveEvent) return;
    if (liveEvent.type === "challenge-live") {
      showToast(`🔴 "${liveEvent.title}" is now LIVE!`);
      refetch();
    }
    if (liveEvent.type === "challenge-over") {
      showToast("✅ A challenge has just ended. Check the leaderboard!");
      refetch();
    }
    if (liveEvent.type === "badge-earned" && liveEvent.userId === currentUserId) {
      showToast(`🏅 New badge: ${liveEvent.badge.icon} ${liveEvent.badge.name}!`);
      refetch();
    }
    if (liveEvent.type === "new-announcement") {
      showToast(`📢 ${liveEvent.announcement.title}`);
      refetch();
    }
    if (liveEvent.type === "leaderboard-updated" || liveEvent.type === "leaderboard-revealed") {
      refetch();
    }
  }, [liveEvent]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  }

  async function handleCreateChallenge(data: Partial<IChallenge>) {
    await createChallenge(data);
  }

  async function handleDeleteChallenge(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this challenge? All submissions will also be removed.")) return;
    await deleteChallenge(id);
  }

  async function handlePostAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!annTitle.trim() || !annBody.trim()) return;
    setPostingAnn(true);
    try {
      await postAnnouncement({ title: annTitle.trim(), body: annBody.trim(), pinned: annPinned });
      setAnnTitle(""); setAnnBody(""); setAnnPinned(false);
      setShowAnnouncement(false);
    } finally {
      setPostingAnn(false);
    }
  }

  // ── Detail view ───────────────────────────────────────────────────────────
  if (selectedChallengeId) {
    return (
      <div className="mt-4">
        <ChallengeDetail
          roomId={roomId}
          challengeId={selectedChallengeId}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          isTeacher={isTeacher}
          onBack={() => { setSelected(null); refetch(); }}
        />
      </div>
    );
  }

  // ── Group challenges by status ────────────────────────────────────────────
  const byStatus = (status: string) => challenges.filter((c) => c.status === status);
  const live      = byStatus("active");
  const upcoming  = byStatus("upcoming");
  const completed = byStatus("completed");
  const drafts    = isTeacher ? byStatus("draft") : [];

  const SUB_TABS: { key: SubTab; label: string; icon: React.ElementType; teacherOnly?: boolean }[] = [
    { key: "challenges",   label: "Challenges",   icon: Zap },
    { key: "leaderboard",  label: "Leaderboard",  icon: Trophy },
    { key: "achievements", label: "Achievements", icon: Award },
    { key: "analytics",    label: "Analytics",    icon: BarChart2, teacherOnly: true },
  ];

  const tabs = SUB_TABS.filter((t) => !t.teacherOnly || isTeacher);

  return (
    <div className="space-y-4 mt-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 bg-gray-900 text-white rounded-2xl shadow-2xl text-sm font-medium flex items-center gap-2 max-w-sm text-center">
          <Bell className="w-4 h-4 flex-shrink-0" />
          {toast}
        </div>
      )}

      {/* My stats strip — students only */}
      {!isTeacher && myStats && (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              {currentUserName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-gray-500">Your rank</p>
              <p className="font-bold text-gray-900">#{myStats.rank}</p>
            </div>
          </div>
          <div className="flex-1 min-w-32">
            <LevelProgress points={myStats.totalPoints} level={myStats.level} compact />
          </div>
          {myStats.streak.current >= 3 && (
            <span className="text-sm font-bold text-orange-500">🔥 {myStats.streak.current}-day streak</span>
          )}
          <div className="flex gap-1 flex-wrap">
            {myStats.badges.slice(0, 4).map((b) => (
              <span key={b.id} title={b.name} className="text-lg">{b.icon}</span>
            ))}
          </div>
        </div>
      )}

      {/* Pinned announcements */}
      {announcements.filter((a) => a.pinned).map((a) => (
        <div key={a._id} className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <Megaphone className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-900 text-sm">{a.title}</p>
            <p className="text-sm text-amber-700 mt-0.5">{a.body}</p>
          </div>
          {isTeacher && (
            <button onClick={() => deleteAnnouncement(a._id)} className="text-amber-400 hover:text-amber-700">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}

      {/* Header actions (teacher) */}
      {isTeacher && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Challenge
          </button>
          <button
            onClick={() => setShowAnnouncement((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Megaphone className="w-4 h-4" /> Announce
          </button>
        </div>
      )}

      {/* Announcement form */}
      {setShowAnnouncement && isTeacher && (
        <form onSubmit={handlePostAnnouncement} className="bg-white rounded-xl border border-amber-200 p-4 space-y-3">
          <h3 className="font-bold text-gray-900 text-sm">Post Announcement</h3>
          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none"
            placeholder="Title"
            value={annTitle}
            onChange={(e) => setAnnTitle(e.target.value)}
            required
          />
          <textarea
            className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-400 outline-none resize-none"
            placeholder="Message…"
            rows={3}
            value={annBody}
            onChange={(e) => setAnnBody(e.target.value)}
            required
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-amber-500" checked={annPinned} onChange={(e) => setAnnPinned(e.target.checked)} />
              Pin announcement
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAnnouncement(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" disabled={postingAnn} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                {postingAnn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Post
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              subTab === key ? "bg-white text-violet-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── CHALLENGES tab ───────────────────────────────────────── */}
      {subTab === "challenges" && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
            </div>
          ) : error ? (
            <p className="text-center text-red-500 text-sm py-8">{error}</p>
          ) : (
            <>
              {live.length === 0 && upcoming.length === 0 && completed.length === 0 && drafts.length === 0 && (
                <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center">
                  <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No challenges yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {isTeacher ? "Create one to start the competition!" : "Check back soon!"}
                  </p>
                </div>
              )}

              {[
                { label: "🔴 Live Now", items: live,      dotColor: "bg-red-500 animate-pulse" },
                { label: "⏰ Upcoming", items: upcoming,  dotColor: "bg-amber-400" },
                { label: "✅ Completed", items: completed, dotColor: "bg-gray-400" },
                { label: "📝 Drafts",   items: drafts,    dotColor: "bg-gray-300", teacherOnly: true },
              ].filter((g) => g.items.length > 0 && (!g.teacherOnly || isTeacher)).map((group) => (
                <div key={group.label}>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                    <span className={`w-2 h-2 rounded-full ${group.dotColor}`} />
                    {group.label}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {group.items.map((c) => (
                      <div key={c._id} className="relative group">
                        <ChallengeCard
                          challenge={c}
                          hasSubmitted={submittedIds.has(c._id)}
                          onClick={() => setSelected(c._id)}
                        />
                        {isTeacher && (
                          <button
                            onClick={(e) => handleDeleteChallenge(c._id, e)}
                            className="absolute top-3 right-3 p-1.5 bg-white border border-gray-200 rounded-lg text-gray-300 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                            title="Delete challenge"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── LEADERBOARD tab ──────────────────────────────────────── */}
      {subTab === "leaderboard" && (
        <RoomLeaderboard roomId={roomId} currentUserId={currentUserId} />
      )}

      {/* ── ACHIEVEMENTS tab ─────────────────────────────────────── */}
      {subTab === "achievements" && (
        <AchievementsPanel stats={myStats} />
      )}

      {/* ── ANALYTICS tab (teacher) ──────────────────────────────── */}
      {subTab === "analytics" && isTeacher && (
        <AnalyticsDashboard roomId={roomId} />
      )}

      {/* Create Challenge Modal */}
      {showCreateModal && (
        <CreateChallengeModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreateChallenge}
        />
      )}
    </div>
  );
}