import { useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useStudentRooms, Invitation, PrivateRoom } from '../hooks/usePrivateRooms';
import Navbar from '../components/Navbar';
import CompetitionTab from '../components/competition/CompetitionTab';
import {
  ArrowLeft, Lock, Users, CheckCircle, XCircle,
  Loader2, ChevronDown, ChevronUp, Bell, Trophy,
} from 'lucide-react';

// ── Invitation card ──────────────────────────────────────────────────────────
function InvitationCard({
  invitation, onRespond,
}: {
  invitation: Invitation;
  onRespond: (roomId: string, action: 'accept' | 'decline') => Promise<void>;
}) {
  const [responding, setResponding] = useState<'accept' | 'decline' | null>(null);
  const teacher = invitation.teacher as any;
  const teacherInitials = teacher?.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'T';

  const handleRespond = async (action: 'accept' | 'decline') => {
    setResponding(action);
    try { await onRespond(invitation.roomId, action); } finally { setResponding(null); }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-violet-200 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-600 rounded-t-2xl" />
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-gray-900 text-lg">{invitation.roomName}</h3>
              <span className="flex items-center gap-1 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full">
                <Bell className="w-3 h-3" /> Invitation
              </span>
            </div>
            {invitation.roomDescription && <p className="text-sm text-gray-500 mb-3">{invitation.roomDescription}</p>}

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-4">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">{teacherInitials}</div>
              <div>
                <p className="text-xs text-gray-500">Invited by</p>
                <p className="text-sm font-semibold text-gray-900">{teacher?.fullName || 'Teacher'}</p>
              </div>
              <p className="text-xs text-gray-400 ml-auto">{new Date(invitation.invitedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => handleRespond('decline')} disabled={responding !== null} className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 text-gray-700 hover:border-red-300 hover:text-red-600 hover:bg-red-50 rounded-xl font-medium text-sm transition-all disabled:opacity-50">
                {responding === 'decline' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}Decline
              </button>
              <button onClick={() => handleRespond('accept')} disabled={responding !== null} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 shadow-sm">
                {responding === 'accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Accept & Join
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Joined room card with competition tab ────────────────────────────────────
function RoomCard({ room, currentUserId, currentUserName }: {
  room: PrivateRoom;
  currentUserId: string;
  currentUserName: string;
}) {
  type RoomTab = 'info' | 'competition';
  const [activeTab, setActiveTab] = useState<RoomTab>('competition');
  const [expanded, setExpanded]   = useState(false);

  const teacher = room.teacherId as any;
  const teacherInitials = teacher?.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'T';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-gray-900 text-lg leading-tight">{room.name}</h3>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" /> Member
              </span>
            </div>
            {room.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{room.description}</p>}
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><Users className="w-3.5 h-3.5" />{room.members.length} member{room.members.length !== 1 ? 's' : ''}</span>
              {teacher?.fullName && <span className="text-xs text-gray-500">by {teacher.fullName}</span>}
            </div>
          </div>
        </div>
        <button onClick={() => setExpanded((v) => !v)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>
      </div>

      {/* Expanded with tabs */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Inner tab bar */}
          <div className="flex border-b border-gray-100">
            {([
              { key: 'competition', label: '🏆 Competition', icon: Trophy },
              { key: 'info',        label: 'Room Info',      icon: Users },
            ] as { key: RoomTab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-violet-500 text-violet-700 bg-violet-50/30'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>

          {/* Competition tab */}
          {activeTab === 'competition' && (
            <div className="p-5">
              <CompetitionTab
                roomId={room._id}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                isTeacher={false}
              />
            </div>
          )}

          {/* Info tab */}
          {activeTab === 'info' && (
            <div className="p-5 space-y-5">
              {/* Teacher */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Instructor</h4>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center font-bold text-sm">{teacherInitials}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{teacher?.fullName}</p>
                    <p className="text-xs text-gray-500">{teacher?.email}</p>
                  </div>
                </div>
              </div>

              {/* Members */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Members ({room.members.length})</h4>
                <div className="space-y-2">
                  {room.members.map((member) => (
                    <div key={member._id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs">
                        {member.fullName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.fullName}</p>
                        <p className="text-xs text-gray-400">{member.email}</p>
                      </div>
                      {member._id === currentUserId && (
                        <span className="ml-auto text-xs text-violet-600 font-semibold">You</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function StudentPrivateRooms() {
  const { user } = useAuth();
  const { setCurrentPage } = useNavigation();
  const { rooms, invitations, loading, respond } = useStudentRooms();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setCurrentPage('dashboard')} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Private Rooms</h1>
            <p className="text-gray-500 text-sm mt-1">Your exclusive learning & competition spaces</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* Pending Invitations */}
            {invitations.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Pending Invitations</h2>
                  <span className="w-6 h-6 bg-violet-600 text-white text-xs font-bold rounded-full flex items-center justify-center">{invitations.length}</span>
                </div>
                <div className="space-y-4">
                  {invitations.map((inv) => (
                    <InvitationCard key={inv.roomId} invitation={inv} onRespond={respond} />
                  ))}
                </div>
              </section>
            )}

            {/* Joined Rooms */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                My Rooms
                {rooms.length > 0 && <span className="ml-2 text-sm font-normal text-gray-500">({rooms.length})</span>}
              </h2>

              {rooms.length === 0 && invitations.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
                  <div className="w-20 h-20 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <Lock className="w-10 h-10 text-violet-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">No private rooms yet</h2>
                  <p className="text-gray-500 text-sm max-w-sm mx-auto">
                    When a teacher invites you, you'll see the invitation here. Check your notifications!
                  </p>
                </div>
              ) : rooms.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
                  <p className="text-gray-400 text-sm">Accept an invitation above to join your first private room.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rooms.map((room) => (
                    <RoomCard
                      key={room._id}
                      room={room}
                      currentUserId={user?._id ?? ''}
                      currentUserName={user?.fullName ?? 'Student'}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}