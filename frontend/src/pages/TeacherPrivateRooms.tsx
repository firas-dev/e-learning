import { useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useTeacherRooms, PrivateRoom } from '../hooks/usePrivateRooms';
import Navbar from '../components/Navbar';
import {
  ArrowLeft, Plus, X, Users, Mail, Trash2,
  Lock, Send, ChevronDown, ChevronUp,
  Loader2, CheckCircle, XCircle, Clock,
  UserMinus, Copy, Check,
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
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function RoomCard({
  room,
  onInvite,
  onRemoveMember,
  onDelete,
}: {
  room: PrivateRoom;
  onInvite: (roomId: string, emails: string[]) => Promise<void>;
  onRemoveMember: (roomId: string, memberId: string) => Promise<void>;
  onDelete: (roomId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ email: string; status: string }[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const pendingInvites = room.invitedEmails.filter((i) => i.status === 'pending');
  const acceptedInvites = room.invitedEmails.filter((i) => i.status === 'accepted');
  const declinedInvites = room.invitedEmails.filter((i) => i.status === 'declined');

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (pendingEmails.includes(email)) return;
    if (room.invitedEmails.some((i) => i.email === email && i.status !== 'declined')) return;
    setPendingEmails((prev) => [...prev, email]);
    setEmailInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmail();
    }
  };

  const handleInvite = async () => {
    if (pendingEmails.length === 0) return;
    setInviting(true);
    setInviteResult(null);
    try {
      const result = await onInvite(room._id, pendingEmails);
      setInviteResult(result.results);
      setPendingEmails([]);
      setEmailInput('');
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(room._id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const copyEmails = () => {
    const emails = room.members.map((m) => m.email).join(', ');
    navigator.clipboard.writeText(emails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">{room.name}</h3>
            {room.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{room.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Users className="w-3.5 h-3.5" />
                {room.members.length} member{room.members.length !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <Clock className="w-3.5 h-3.5" />
                {pendingInvites.length} pending
              </span>
              <span className="text-xs text-gray-400">
                Created {new Date(room.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {room.members.length > 0 && (
            <button
              onClick={copyEmails}
              title="Copy member emails"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
            </button>
          )}
          <button
            onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Mail className="w-3.5 h-3.5" /> Invite
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 bg-violet-50/50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-gray-900">Invite by email</h4>
            <button onClick={() => { setShowInviteForm(false); setPendingEmails([]); setInviteResult(null); }}>
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          {/* Email tag input */}
          <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-xl bg-white min-h-[44px] mb-3 focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent transition-all">
            {pendingEmails.map((email) => (
              <span
                key={email}
                className="flex items-center gap-1.5 bg-violet-100 text-violet-800 text-xs font-medium px-2.5 py-1 rounded-full"
              >
                {email}
                <button onClick={() => setPendingEmails((p) => p.filter((e) => e !== email))}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={addEmail}
              placeholder={pendingEmails.length === 0 ? "Type email and press Enter…" : "Add more…"}
              className="flex-1 min-w-32 text-sm outline-none bg-transparent placeholder-gray-400"
            />
          </div>

          <p className="text-xs text-gray-500 mb-3">
            Students without an account will receive an invitation when they sign up with that email.
          </p>

          {inviteResult && (
            <div className="mb-3 space-y-1">
              {inviteResult.map(({ email, status }) => (
                <div key={email} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                  status === 'invited_with_notification' ? 'bg-green-50 text-green-700' :
                  status === 'already_invited' ? 'bg-amber-50 text-amber-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {status === 'invited_with_notification' && <CheckCircle className="w-3.5 h-3.5" />}
                  {status === 'already_invited' && <Clock className="w-3.5 h-3.5" />}
                  {status === 'invited_no_account' && <Mail className="w-3.5 h-3.5" />}
                  <span className="font-medium">{email}</span>
                  <span>—</span>
                  <span>
                    {status === 'invited_with_notification' ? 'Notified successfully' :
                     status === 'already_invited' ? 'Already invited' :
                     'Invited (no account yet)'}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setShowInviteForm(false); setPendingEmails([]); setInviteResult(null); }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Done
            </button>
            <button
              onClick={handleInvite}
              disabled={pendingEmails.length === 0 || inviting}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {inviting ? 'Sending…' : `Send ${pendingEmails.length} invite${pendingEmails.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 p-5 space-y-5">
          {/* Members */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users className="w-3.5 h-3.5" /> Members ({room.members.length})
            </h4>
            {room.members.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No members yet.</p>
            ) : (
              <div className="space-y-2">
                {room.members.map((member) => (
                  <div key={member._id} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-sm">
                        {member.fullName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{member.fullName}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveMember(room._id, member._id)}
                      title="Remove member"
                      className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending */}
          {pendingInvites.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" /> Pending invitations ({pendingInvites.length})
              </h4>
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div key={invite.email} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{invite.email}</p>
                        <p className="text-xs text-gray-500">
                          Invited {new Date(invite.invitedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status="pending" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Declined */}
          {declinedInvites.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5" /> Declined ({declinedInvites.length})
              </h4>
              <div className="space-y-2">
                {declinedInvites.map((invite) => (
                  <div key={invite.email} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl opacity-70">
                    <p className="text-sm text-gray-600">{invite.email}</p>
                    <StatusBadge status="declined" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Room?</h3>
            <p className="text-gray-600 text-sm mb-6">
              "{room.name}" and all its member data will be permanently removed. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeacherPrivateRooms() {
  const { setCurrentPage } = useNavigation();
  const { rooms, loading, error, createRoom, inviteStudents, removeMember, deleteRoom } = useTeacherRooms();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) { setCreateError('Room name is required.'); return; }
    setCreating(true);
    setCreateError('');
    try {
      await createRoom(newRoomName.trim(), newRoomDesc.trim() || undefined);
      setShowCreateForm(false);
      setNewRoomName('');
      setNewRoomDesc('');
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || 'Failed to create room.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Private Rooms</h1>
            <p className="text-gray-500 text-sm mt-1">
              Create exclusive rooms and invite students by email
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" /> New Room
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

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
                <button onClick={() => setShowCreateForm(false)}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Room Name *</label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    required
                    placeholder="e.g. Advanced Python Group"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Description <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    rows={3}
                    placeholder="What is this room for?"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm resize-none transition-all"
                  />
                </div>
                {createError && (
                  <p className="text-sm text-red-600">{createError}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {creating ? 'Creating…' : 'Create Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Rooms list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
            <div className="w-20 h-20 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Lock className="w-10 h-10 text-violet-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No private rooms yet</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
              Create a private room to invite specific students via email and collaborate in a closed space.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" /> Create Your First Room
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => (
              <RoomCard
                key={room._id}
                room={room}
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