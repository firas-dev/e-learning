import { useRef, useEffect, useState } from 'react';
import { Lock, X, CheckCircle, XCircle, Loader2, Bell } from 'lucide-react';
import { useStudentRooms, Invitation } from '../hooks/usePrivateRooms';
import { useNavigation } from '../contexts/NavigationContext';

function InvitationDropdownCard({
  invitation,
  onRespond,
  onClose,
}: {
  invitation: Invitation;
  onRespond: (roomId: string, action: 'accept' | 'decline') => Promise<void>;
  onClose: () => void;
}) {
  const [responding, setResponding] = useState<'accept' | 'decline' | null>(null);
  const teacher = invitation.teacher as any;

  const handleRespond = async (action: 'accept' | 'decline') => {
    setResponding(action);
    try {
      await onRespond(invitation.roomId, action);
    } finally {
      setResponding(null);
    }
  };

  return (
    <div className="p-3 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Lock className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{invitation.roomName}</p>
          <p className="text-xs text-gray-500">
            From <span className="font-medium text-gray-700">{teacher?.fullName || 'Teacher'}</span>
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleRespond('decline')}
          disabled={responding !== null}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
        >
          {responding === 'decline' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
          Decline
        </button>
        <button
          onClick={() => handleRespond('accept')}
          disabled={responding !== null}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          {responding === 'accept' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          Accept
        </button>
      </div>
    </div>
  );
}

export default function InvitationBell() {
  const { invitations, pendingCount, respond } = useStudentRooms();
  const { setCurrentPage } = useNavigation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (pendingCount === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="Room invitations"
      >
        <Lock className="w-5 h-5 text-violet-600" />
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-violet-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
          {pendingCount > 9 ? '9+' : pendingCount}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-violet-600" />
              <h3 className="font-bold text-gray-900 text-sm">Room Invitations</h3>
              <span className="w-5 h-5 bg-violet-100 text-violet-700 text-xs font-bold rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            </div>
            <button onClick={() => setOpen(false)}>
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {invitations.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">No pending invitations</div>
            ) : (
              invitations.map((inv) => (
                <InvitationDropdownCard
                  key={inv.roomId}
                  invitation={inv}
                  onRespond={respond}
                  onClose={() => setOpen(false)}
                />
              ))
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => { setCurrentPage('private-rooms'); setOpen(false); }}
              className="w-full text-center text-xs text-violet-600 hover:text-violet-700 font-medium"
            >
              View all rooms →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}