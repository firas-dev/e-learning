import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useCompetition } from '../hooks/useCompetition';
import { useRoomSocket } from '../hooks/useRoomSocket';
import Navbar from '../components/Navbar';
import ChallengeCard from '../components/competition/ChallengeCard';
import RoomLeaderboard from '../components/competition/RoomLeaderboard';
import AchievementsBadges from '../components/competition/AchievementsBadges';
import AnalyticsDashboard from '../components/competition/AnalyticsDashboard';
import AnnouncementBanner from '../components/competition/AnnouncementBanner';
import ChallengeDetail from '../components/competition/ChallengeDetail';
import StudentStatsCard from '../components/competition/StudentStatsCard';
import {
  Trophy, Zap, Award, MessageSquare,
  BarChart2, ArrowLeft, Bell, Plus,
} from 'lucide-react';

type Tab = 'challenges' | 'leaderboard' | 'achievements' | 'discussion' | 'analytics';

interface CompetitionRoomProps {
  roomId: string;
  roomName: string;
}

export default function CompetitionRoom({ roomId, roomName }: CompetitionRoomProps) {
  const { user } = useAuth();
  const { setCurrentPage } = useNavigation();
  const isTeacher = user?.role === 'teacher';

  const {
    challenges, announcements, myStats,
    loading, createChallenge, submitChallenge,
    refetch,
  } = useCompetition(roomId);

  const { liveEvent } = useRoomSocket(roomId, user?._id || '');

  const [activeTab, setActiveTab] = useState<Tab>('challenges');
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // React to live socket events
  useEffect(() => {
    if (!liveEvent) return;
    if (liveEvent.type === 'challenge-live') {
      setToast(`🔴 "${liveEvent.challenge.title}" is now LIVE!`);
      refetch();
      setTimeout(() => setToast(null), 5000);
    }
    if (liveEvent.type === 'badge-earned' && liveEvent.userId === user?._id) {
      setToast(`🏅 You earned the "${liveEvent.badge.name}" badge!`);
      setTimeout(() => setToast(null), 5000);
    }
  }, [liveEvent]);

  const TABS: { key: Tab; label: string; icon: React.ElementType; teacherOnly?: boolean }[] = [
    { key: 'challenges',   label: 'Challenges',    icon: Zap },
    { key: 'leaderboard',  label: 'Leaderboard',   icon: Trophy },
    { key: 'achievements', label: 'Achievements',  icon: Award },
    { key: 'discussion',   label: 'Discussion',    icon: MessageSquare },
    { key: 'analytics',    label: 'Analytics',     icon: BarChart2, teacherOnly: true },
  ];

  if (selectedChallenge) {
    return (
      <ChallengeDetail
        roomId={roomId}
        challengeId={selectedChallenge}
        onBack={() => setSelectedChallenge(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Live toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gray-900 text-white rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 animate-bounce">
          <Bell className="w-4 h-4" /> {toast}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setCurrentPage('private-rooms')} className="p-2 hover:bg-gray-200 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{roomName}</h1>
              <span className="text-xs bg-violet-100 text-violet-700 border border-violet-200 px-3 py-1 rounded-full font-semibold">
                🏆 Competition Room
              </span>
            </div>
          </div>
          {isTeacher && (
            <button
              onClick={() => {/* open create challenge modal */}}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium"
            >
              <Plus className="w-4 h-4" /> New Challenge
            </button>
          )}
        </div>

        {/* Announcements */}
        {announcements.filter((a) => a.pinned).map((a) => (
          <AnnouncementBanner key={a._id} announcement={a} />
        ))}

        {/* My Stats strip (students) */}
        {!isTeacher && myStats && <StudentStatsCard stats={myStats} className="mb-6" />}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS
            .filter((t) => !t.teacherOnly || isTeacher)
            .map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === key
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
        </div>

        {/* Tab content */}
        {activeTab === 'challenges' && (
          <div className="space-y-4">
            {['active', 'upcoming', 'completed'].map((status) => {
              const group = challenges.filter((c) => c.status === status);
              if (!group.length) return null;
              return (
                <div key={status}>
                  <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-red-500 animate-pulse' : status === 'upcoming' ? 'bg-amber-400' : 'bg-gray-400'}`} />
                    {status === 'active' ? 'Live Now' : status === 'upcoming' ? 'Upcoming' : 'Completed'}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {group.map((c) => (
                      <ChallengeCard
                        key={c._id}
                        challenge={c}
                        onClick={() => setSelectedChallenge(c._id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {challenges.length === 0 && (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center">
                <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No challenges yet.
                  {isTeacher ? ' Create one to get started!' : ' Check back soon!'}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && <RoomLeaderboard roomId={roomId} />}
        {activeTab === 'achievements' && <AchievementsBadges roomId={roomId} myStats={myStats} />}
        {activeTab === 'analytics' && isTeacher && <AnalyticsDashboard roomId={roomId} />}
      </div>
    </div>
  );
}