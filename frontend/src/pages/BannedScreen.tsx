import { useState, useEffect } from 'react';
import { ShieldOff, LogOut, Clock, AlertTriangle, Home, BookOpen, User, MessageCircle, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface BannedScreenProps {
  banExpiresAt: string | null;
}

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    if (!targetDate) return;

    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

export default function BannedScreen({ banExpiresAt }: BannedScreenProps) {
  const { signOut } = useAuth();
  const countdown = useCountdown(banExpiresAt);

  const restoreDate = banExpiresAt
    ? new Date(banExpiresAt).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  // Dummy disabled nav items
  const disabledNavItems = [
    { icon: Home,         label: 'Dashboard' },
    { icon: BookOpen,     label: 'Courses'   },
    { icon: MessageCircle,label: 'Messages'  },
    { icon: User,         label: 'Profile'   },
    { icon: Settings,     label: 'Settings'  },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg hidden sm:block">EduSmart AI</span>
        </div>

        {/* Disabled nav links */}
        <div className="hidden md:flex items-center gap-1">
          {disabledNavItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              disabled
              title="Unavailable while suspended"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-300 cursor-not-allowed select-none"
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Logout — only active button */}
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </nav>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg text-center">

          {/* Icon */}
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ShieldOff className="w-12 h-12 text-red-500" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Suspended</h1>
          <p className="text-gray-500 text-base mb-8 leading-relaxed">
            Your account has been temporarily suspended due to a violation of our community guidelines.
            Your access will be automatically restored when the suspension period ends.
          </p>

          {/* Countdown */}
          {banExpiresAt && !countdown.expired && (
            <div className="bg-white border border-red-100 rounded-2xl p-6 mb-6 shadow-sm">
              <div className="flex items-center justify-center gap-2 text-red-500 mb-4">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-semibold uppercase tracking-wide">Time remaining</span>
              </div>
              <div className="flex justify-center gap-4">
                {[
                  { value: countdown.days,    label: 'Days'    },
                  { value: countdown.hours,   label: 'Hours'   },
                  { value: countdown.minutes, label: 'Minutes' },
                  { value: countdown.seconds, label: 'Seconds' },
                ].map(({ value, label }) => (
                  <div key={label} className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl font-bold text-red-600 tabular-nums">
                        {String(value).padStart(2, '0')}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 mt-1.5 font-medium">{label}</span>
                  </div>
                ))}
              </div>
              {restoreDate && (
                <p className="text-sm text-gray-500 mt-4">
                  Restores on <span className="font-semibold text-gray-700">{restoreDate}</span>
                </p>
              )}
            </div>
          )}

          {/* Expired — prompt to refresh */}
          {countdown.expired && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 mb-6">
              <p className="text-green-700 font-semibold text-sm">
                ✅ Your suspension period has ended. Please log out and log back in to restore access.
              </p>
            </div>
          )}

          {/* Warning notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3 text-left">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 leading-relaxed">
              Future violations of our community guidelines may result in additional suspensions or permanent removal from the platform.
              Please review our guidelines before your account is restored.
            </p>
          </div>

          {/* Logout button */}
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors shadow-sm"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}