import { Megaphone, CheckCircle, X, AlertTriangle, Globe, GraduationCap, Users, Shield, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { useAnnouncement } from "../../../hooks/useAdmin";

export default function AnnouncementsTab() {
    const { send, sending, result, error, clearResult } = useAnnouncement();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetRole, setTargetRole] = useState('all');
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      await send(title, message, targetRole);
      setTitle('');
      setMessage('');
      setTargetRole('all');
    };
  
    return (
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Send Announcement</h2>
              <p className="text-xs text-gray-500">Broadcast a message to users via in-app notifications</p>
            </div>
          </div>
  
          {result && (
            <div className="mb-5 flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">{result.message}</p>
                <p className="text-xs text-green-600 mt-0.5">Notification sent to {result.count} user{result.count !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={clearResult} className="ml-auto p-1 hover:bg-green-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
  
          {error && (
            <div className="mb-5 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
  
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Audience</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'all', label: 'Everyone', icon: Globe },
                  { value: 'student', label: 'Students', icon: GraduationCap },
                  { value: 'teacher', label: 'Teachers', icon: Users },
                  { value: 'admin', label: 'Admins', icon: Shield },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTargetRole(value)}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-medium transition-all ${
                      targetRole === value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-600 hover:border-indigo-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
  
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={100}
                placeholder="e.g. Platform maintenance scheduled"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">{title.length}/100</p>
            </div>
  
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                maxLength={500}
                rows={4}
                placeholder="Write your announcement here…"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm outline-none resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{message.length}/500</p>
            </div>
  
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  This will send a notification to <strong>all {targetRole === 'all' ? 'users' : targetRole + 's'}</strong> on the platform.
                  This action cannot be undone.
                </span>
              </p>
            </div>
  
            <button
              type="submit"
              disabled={sending || !title.trim() || !message.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
              ) : (
                <><Send className="w-4 h-4" /> Send Announcement</>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }