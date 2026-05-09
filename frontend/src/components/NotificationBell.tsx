import { useRef, useEffect, useState } from 'react';
import { Bell, X, CheckCheck, CheckCircle, XCircle, Loader2, Lock, AlertTriangle, MessageSquare } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useStudentRooms } from '../hooks/usePrivateRooms';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';

const isRoomInvitation  = (title: string) => title.includes('Private Room Invitation');
const isCommentWarning  = (title: string) => title.includes('Warning') || title.includes('⚠️');
const isCommentNotif    = (title: string) => title.includes('💬');

function RoomInvitationActions({
  notificationId, roomId, alreadyRead, onResponded,
}: {
  notificationId: string;
  roomId: string;
  alreadyRead: boolean;
  onResponded: (id: string, action: 'accepted' | 'declined') => void;
}) {
  const { respond } = useStudentRooms();
  const [responding, setResponding] = useState<'accept' | 'decline' | null>(null);
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null);

  if (alreadyRead && !done) {
    return (
      <div className="mt-2 text-xs font-semibold flex items-center gap-1 text-green-600">
        <CheckCircle className="w-3.5 h-3.5" /> Joined the room!
      </div>
    );
  }

  const handleRespond = async (action: 'accept' | 'decline') => {
    setResponding(action);
    try {
      await respond(roomId, action);
      const result = action === 'accept' ? 'accepted' : 'declined';
      setDone(result);
      setTimeout(() => onResponded(notificationId, result), 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setResponding(null);
    }
  };

  if (done) {
    return (
      <div className={`mt-2 text-xs font-semibold flex items-center gap-1 ${done === 'accepted' ? 'text-green-600' : 'text-gray-500'}`}>
        {done === 'accepted'
          ? <><CheckCircle className="w-3.5 h-3.5" /> Joined the room!</>
          : <><XCircle className="w-3.5 h-3.5" /> Declined</>}
      </div>
    );
  }

  return (
    <div className="flex gap-2 mt-2">
      <button onClick={() => handleRespond('decline')} disabled={responding !== null}
        className="flex-1 flex items-center justify-center gap-1 py-1 border border-gray-200 text-gray-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-lg text-xs font-medium transition-all disabled:opacity-50">
        {responding === 'decline' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
        Decline
      </button>
      <button onClick={() => handleRespond('accept')} disabled={responding !== null}
        className="flex-1 flex items-center justify-center gap-1 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
        {responding === 'accept' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
        Accept
      </button>
    </div>
  );
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { setCurrentPage } = useNavigation();
  const { notifications, unreadCount, open, setOpen, markAsRead, markAllAsRead } = useNotifications();
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isStudent = user?.role === 'student';

  const handleInvitationResponded = (id: string, action: 'accepted' | 'declined') => {
    if (action === 'accepted') setAcceptedIds((prev) => new Set(prev).add(id));
    markAsRead(id);
  };

  // Navigate to the course+lesson where the comment lives, then scroll to comments
  const handleCommentNotifClick = (n: { _id: string; courseId?: string; lessonId?: string; read: boolean }) => {
    if (!n.read) markAsRead(n._id);
    if (!n.courseId) return;

    // Store destination in sessionStorage so RecordedCourse can pick it up
    sessionStorage.setItem('selectedCourse', JSON.stringify({ id: n.courseId, title: 'Course', type: 'recorded' }));
    if (n.lessonId) {
      sessionStorage.setItem('notif_target_lesson', n.lessonId);
    } else {
      sessionStorage.removeItem('notif_target_lesson');
    }
    sessionStorage.setItem('notif_scroll_comments', '1');

    setCurrentPage('recorded-course');
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
        <Bell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
                  <CheckCheck className="w-4 h-4" /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)}>
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isInvite   = isStudent && isRoomInvitation(n.title);
                const isWarning  = isCommentWarning(n.title);
                const isComment  = isCommentNotif(n.title);
                const wasAccepted = acceptedIds.has(n._id);
                const isClickable = isWarning || isComment;

                const bgClass = wasAccepted
                  ? 'bg-green-50'
                  : !n.read ? 'bg-blue-50' : '';

                return (
                  <div
                    key={n._id}
                    onClick={() => {
                      if (isWarning || isComment) handleCommentNotifClick(n);
                      else if (!isInvite && !n.read) markAsRead(n._id);
                    }}
                    className={`px-4 py-3 transition-colors ${
                      isInvite && !n.read ? 'cursor-default'
                      : isClickable ? 'cursor-pointer hover:bg-blue-50'
                      : 'cursor-pointer hover:bg-gray-50'
                    } ${bgClass}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      {isInvite ? (
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${wasAccepted || n.read ? 'bg-green-100' : 'bg-violet-100'}`}>
                          {wasAccepted || n.read
                            ? <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                            : <Lock className="w-3.5 h-3.5 text-violet-600" />}
                        </div>
                      ) : isWarning ? (
                        <div className="w-7 h-7 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
                        </div>
                      ) : isComment ? (
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                      ) : (
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                        {isClickable && n.courseId && (
                          <p className="text-xs text-blue-500 mt-1 font-medium">Tap to view the comment →</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>

                        {isInvite && n.courseId && (
                          <RoomInvitationActions
                            notificationId={n._id}
                            roomId={n.courseId}
                            alreadyRead={n.read}
                            onResponded={handleInvitationResponded}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}