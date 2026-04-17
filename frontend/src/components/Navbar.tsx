import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { BookOpen, LogOut, Settings, User, MessageCircle } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useMessages } from '../hooks/useMessages';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { setCurrentPage } = useNavigation();
  const { unreadCount } = useMessages();
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">EduSmart AI</span>
          </button>
          {/* User Info & Actions */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {user?.fullName?.charAt(0) ?? 'U'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {user?.fullName ?? 'Guest User'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role ?? 'student'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* ✅ Bell only for students */}
              {user?.role === 'student' && <NotificationBell />}

              {/* ✅ Messages button */}
              <button
                onClick={() => setCurrentPage('messages')}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Messages"
              >
                <MessageCircle className="w-5 h-5 text-gray-600" />

                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setCurrentPage('profile')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="My profile"
              >
                <User className="w-5 h-5 text-gray-600" />
              </button>

              <button
                onClick={() => setCurrentPage('privacy')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>

              <button
                onClick={handleSignOut}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}