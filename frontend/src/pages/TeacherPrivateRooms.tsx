import { useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useTeacherRooms, PrivateRoom } from '../hooks/usePrivateRooms';
import Navbar from '../components/Navbar';
import CompetitionTab from '../components/competition/CompetitionTab';
import {
  ArrowLeft, Plus, X, Users, Mail, Trash2,
  Lock, Send, ChevronDown, ChevronUp,
  Loader2, CheckCircle, XCircle, Clock,
  UserMinus, Copy, Check, Trophy,
} from 'lucide-react';

function StatusBadge({ status }: { status: 'pending' | 'accepted' | 'declined' }) {
  const config = {
    pending:  { label: 'Pending',  icon: Clock,       cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    accepted: { label: 'Joined',   icon: CheckCircle, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    declined: { label: 'Declined', icon: XCircle,     cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  };
  const { label, icon: Icon, cls } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  );
}

// ── Room card with integrated competition tab ────────────────────────────────
function RoomCard({
  room, currentUserId,
  onInvite, onRemoveMember, onDelete,
}: {
  room: PrivateRoom;
  currentUserId: string;
  onInvite: (roomId: string, emails: string[]) => Promise<void>;
  onRemoveMember: (roomId: string, memberId: string) => Promise<void>;
  onDelete: (roomId: string) => Promise<void>;
}) {
  type RoomTab = 'members' | 'competition';
  const [activeTab, setActiveTab]       = useState<RoomTab>('members');
  const [showInviteForm, setShowInvite] = useState(false);
  const [emailInput, setEmailInput]     = useState('');
  const [pendingEmails, setPending]     = useState<string[]>([]);
  const [inviting, setInviting]         = useState(false);
  const [inviteResult, setInviteResult] = useState<{ email: string; status: string }[] | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [confirmDelete, setConfirm]     = useState(false);
  const [expanded, setExpanded]         = useState(false);
  const [copied, setCopied]             = useState(false);

  const pendingInvites  = room.invitedEmails.filter((i) => i.status === 'pending');
  const declinedInvites = room.invitedEmails.filter((i) => i.status === 'declined');

  const addEmail = () => {
    const e = emailInput.trim().toLowerCase();
    if (!e || !e.includes('@') || pendingEmails.includes(e)) return;
    setPending((p) => [...p, e]);
    setEmailInput('');
  };

  const handleInvite = async () => {
    if (!pendingEmails.length) return;
    setInviting(true);
    try {
      const res = await onInvite(room._id, pendingEmails);
      setInviteResult((res as any).results);
      setPending([]);
      setEmailInput('');
    } finally { setInviting(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(room._id); } finally { setDeleting(false); setConfirm(false); }
  };

  const copyEmails = () => {
    navigator.clipboard.writeText(room.members.map((m) => m.email).join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Room header */}
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">{room.name}</h3>
            {room.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{room.description}</p>}
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Users className="w-3.5 h-3.5" />{room.members.length} member{room.members.length !== 1 ? 's' : ''}
              </span>
              {pendingInvites.length > 0 && (
                <span className="text-xs text-amber-600 font-medium">
                  <Clock className="w-3 h-3 inline mr-1" />{pendingInvites.length} pending
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {room.members.length > 0 && (
            <button onClick={copyEmails} title="Copy emails" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
            </button>
          )}
          <button onClick={() => setShowInvite(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium transition-colors">
            <Mail className="w-3.5 h-3.5" /> Invite
          </button>
          <button onClick={() => setExpanded((v) => !v)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
          <button onClick={() => setConfirm(true)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 bg-violet-50/40">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-gray-900">Invite by email</h4>
            <button onClick={() => { setShowInvite(false); setPending([]); setInviteResult(null); }}>
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-xl bg-white min-h-[44px] mb-3 focus-within:ring-2 focus-within:ring-violet-500">
            {pendingEmails.map((e) => (
              <span key={e} className="flex items-center gap-1.5 bg-violet-100 text-violet-800 text-xs font-medium px-2.5 py-1 rounded-full">
                {e}<button onClick={() => setPending((p) => p.filter((x) => x !== e))}><X className="w-3 h-3" /></button>
              </span>
            ))}
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(); } }}
              onBlur={addEmail}
              placeholder={pendingEmails.length === 0 ? 'Type email and press Enter…' : 'Add more…'}
              className="flex-1 min-w-32 text-sm outline-none bg-transparent"
            />
          </div>
          {inviteResult && (
            <div className="mb-3 space-y-1">
              {inviteResult.map(({ email, status }) => (
                <div key={email} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                  status === 'invited_with_notification' ? 'bg-green-50 text-green-700' :
                  status === 'already_invited' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                }`}>
                  <span className="font-medium">{email}</span> —{' '}
                  {status === 'invited_with_notification' ? 'Notified' :
                   status === 'already_invited' ? 'Already invited' : 'Invited (no account yet)'}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setShowInvite(false); setPending([]); setInviteResult(null); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Done</button>
            <button onClick={handleInvite} disabled={!pendingEmails.length || inviting} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {inviting ? 'Sending…' : `Send ${pendingEmails.length} invite${pendingEmails.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Expanded section with tabs */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Inner tab bar */}
          <div className="flex border-b border-gray-100">
            {([
              { key: 'members',     label: 'Members & Invites', icon: Users },
              { key: 'competition', label: '🏆 Competition',    icon: Trophy },
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
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Members tab */}
          {activeTab === 'members' && (
            <div className="p-5 space-y-5">
              {/* Members list */}
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Members ({room.members.length})
                </h4>
                {room.members.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No members yet.</p>
                ) : (
                  <div className="space-y-2">
                    {room.members.map((member) => (
                      <div key={member._id} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-sm">
                            {member.fullName?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{member.fullName}</p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                        </div>
                        <button onClick={() => onRemoveMember(room._id, member._id)} title="Remove" className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending invites */}
              {pendingInvites.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Pending ({pendingInvites.length})
                  </h4>
                  <div className="space-y-2">
                    {pendingInvites.map((inv) => (
                      <div key={inv.email} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{inv.email}</p>
                            <p className="text-xs text-gray-400">Invited {new Date(inv.invitedAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <StatusBadge status="pending" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {declinedInvites.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Declined</h4>
                  <div className="space-y-2">
                    {declinedInvites.map((inv) => (
                      <div key={inv.email} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl opacity-70">
                        <p className="text-sm text-gray-600">{inv.email}</p>
                        <StatusBadge status="declined" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Competition tab */}
          {activeTab === 'competition' && (
            <div className="p-5">
              <CompetitionTab
                roomId={room._id}
                currentUserId={currentUserId}
                currentUserName="Teacher"
                isTeacher={true}
              />
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Room?</h3>
            <p className="text-gray-600 text-sm mb-6">
              "{room.name}" and all challenges/submissions will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(false)} disabled={deleting} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}{deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function TeacherPrivateRooms() {
  const { user } = useAuth();
  const { setCurrentPage } = useNavigation();
  const { rooms, loading, error, createRoom, inviteStudents, removeMember, deleteRoom } = useTeacherRooms();

  const [showCreateForm, setShowCreate] = useState(false);
  const [newName, setNewName]           = useState('');
  const [newDesc, setNewDesc]           = useState('');
  const [creating, setCreating]         = useState(false);
  const [createError, setCreateError]   = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { setCreateError('Room name is required.'); return; }
    setCreating(true); setCreateError('');
    try {
      await createRoom(newName.trim(), newDesc.trim() || undefined);
      setShowCreate(false); setNewName(''); setNewDesc('');
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || 'Failed to create room.');
    } finally { setCreating(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setCurrentPage('dashboard')} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Private Rooms</h1>
            <p className="text-gray-500 text-sm mt-1">Manage rooms, members, and competitions</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors shadow-sm">
            <Plus className="w-5 h-5" /> New Room
          </button>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

        {/* Create Room Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                    <Lock className="w-5 h-5 text-violet-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Create Private Room</h2>
                </div>
                <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Room Name *</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="e.g. Advanced Python Group" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} rows={3} placeholder="What is this room for?" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm resize-none transition-all" />
                </div>
                {createError && <p className="text-sm text-red-600">{createError}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium">Cancel</button>
                  <button type="submit" disabled={creating} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {creating ? 'Creating…' : 'Create Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-10 h-10 text-violet-600 animate-spin" /></div>
        ) : rooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
            <div className="w-20 h-20 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Lock className="w-10 h-10 text-violet-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No private rooms yet</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">Create a room to invite students and run competitions.</p>
            <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors">
              <Plus className="w-5 h-5" /> Create Your First Room
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <RoomCard
                key={room._id}
                room={room}
                currentUserId={user?._id ?? ''}
                onInvite={inviteStudents}
                onRemoveMember={removeMember}
                onDelete={deleteRoom}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}