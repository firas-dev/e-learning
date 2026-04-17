import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useMessages } from '../hooks/useMessages';
import Navbar from '../components/Navbar';
import {
  Send, ArrowLeft, MessageCircle, Search, X,
  Plus, ChevronRight, Clock, CheckCheck, Loader2,
  User, BookOpen,
} from 'lucide-react';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function Messaging() {
  const { user } = useAuth();
  const { setCurrentPage } = useNavigation();
  const {
    conversations, activeConversation, messages,
    messageableUsers, loading, messagesLoading, sending,
    fetchMessageableUsers, openConversation, startConversation, sendMessage,
  } = useMessages(user?._id || '');

  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [startingWith, setStartingWith] = useState<string | null>(null);
  const [startError, setStartError] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (showNewChat && user?.role) {
      fetchMessageableUsers(user.role);
    }
  }, [showNewChat, user?.role, fetchMessageableUsers]);

  const filteredConversations = conversations.filter((c) =>
    c.partner.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = messageableUsers.filter((u) =>
    u.fullName.toLowerCase().includes(newChatSearch.toLowerCase()) ||
    u.courseTitle.toLowerCase().includes(newChatSearch.toLowerCase())
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    await sendMessage(text.trim());
    setText('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  const handleStartConversation = async (partnerId: string) => {
    if (!user?.role) return;
    setStartingWith(partnerId);
    setStartError('');
    try {
      await startConversation(partnerId, user.role);
      setShowNewChat(false);
      setNewChatSearch('');
      setMobileView('chat');
    } catch (err: any) {
      setStartError(err.message);
    } finally {
      setStartingWith(null);
    }
  };

  const handleOpenConversation = async (conv: typeof conversations[0]) => {
    await openConversation(conv);
    setMobileView('chat');
  };

  const roleLabel = user?.role === 'student' ? 'Teacher' : 'Student';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-500">Private conversations with your {user?.role === 'student' ? 'teachers' : 'students'}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex"
          style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>

          {/* ── Sidebar ── */}
          <div className={`w-full md:w-80 border-r border-gray-100 flex flex-col flex-shrink-0
            ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>

            {/* Search + New */}
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search ${roleLabel.toLowerCase()}s…`}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  />
                </div>
                <button
                  onClick={() => setShowNewChat(true)}
                  title={`New message`}
                  className="flex-shrink-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 mb-1">
                    {search ? 'No conversations match' : 'No conversations yet'}
                  </p>
                  {!search && (
                    <button
                      onClick={() => setShowNewChat(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Start one →
                    </button>
                  )}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isActive = activeConversation?._id === conv._id;
                  return (
                    <button
                      key={conv._id}
                      onClick={() => handleOpenConversation(conv)}
                      className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors border-b border-gray-50 hover:bg-blue-50/50
                        ${isActive ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {getInitials(conv.partner.fullName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-sm font-semibold truncate ${conv.unread > 0 ? 'text-gray-900' : 'text-gray-700'}`}>
                            {conv.partner.fullName}
                          </span>
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                            {conv.lastMessageAt && (
                              <span className="text-xs text-gray-400">{formatTime(conv.lastMessageAt)}</span>
                            )}
                            {conv.unread > 0 && (
                              <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                {conv.unread > 9 ? '9+' : conv.unread}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className={`text-xs truncate ${conv.unread > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                          {conv.lastMessage || 'No messages yet'}
                        </p>
                        {conv.course && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-500 mt-0.5">
                            <BookOpen className="w-3 h-3" />{conv.course.title}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Chat Panel ── */}
          <div className={`flex-1 flex flex-col min-w-0
            ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>

            {activeConversation ? (
              <>
                {/* Chat header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 bg-white">
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {getInitials(activeConversation.partner.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{activeConversation.partner.fullName}</p>
                    {activeConversation.course && (
                      <p className="text-xs text-blue-500 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />{activeConversation.course.title}
                      </p>
                    )}
                  </div>
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50/50">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                        <MessageCircle className="w-8 h-8 text-blue-400" />
                      </div>
                      <p className="text-gray-500 font-medium mb-1">Start the conversation</p>
                      <p className="text-sm text-gray-400">Send a message to {activeConversation.partner.fullName}</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderId === user?._id;
                      return (
                        <div key={msg._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          {!isMine && (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 self-end mb-0.5">
                              {getInitials(activeConversation.partner.fullName)}
                            </div>
                          )}
                          <div className={`max-w-[70%] group`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isMine
                                ? 'bg-blue-600 text-white rounded-br-sm'
                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                            }`}>
                              {msg.text}
                            </div>
                            <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                              {isMine && (
                                <CheckCheck className={`w-3 h-3 ${msg.read ? 'text-blue-500' : 'text-gray-300'}`} />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="px-4 py-3 border-t border-gray-100 bg-white">
                  <form onSubmit={handleSend} className="flex items-end gap-2">
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                      rows={1}
                      className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none resize-none transition-all"
                      style={{ maxHeight: '120px', overflowY: 'auto' }}
                    />
                    <button
                      type="submit"
                      disabled={!text.trim() || sending}
                      className="flex-shrink-0 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : <Send className="w-5 h-5" />
                      }
                    </button>
                  </form>
                  <p className="text-xs text-gray-400 mt-1.5 ml-1">Enter to send · Shift+Enter for new line</p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-16 px-8">
                <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-5">
                  <MessageCircle className="w-10 h-10 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Your messages</h2>
                <p className="text-gray-500 text-sm mb-6 max-w-xs">
                  {user?.role === 'student'
                    ? 'Send private messages to your teachers for help and questions.'
                    : 'Reply to your students and offer personalized guidance.'}
                </p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Conversation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── New Conversation Modal ── */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                New Message to {roleLabel}
              </h2>
              <button
                onClick={() => { setShowNewChat(false); setNewChatSearch(''); setStartError(''); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  placeholder={`Search ${roleLabel.toLowerCase()}s…`}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                />
              </div>
              {startError && (
                <p className="text-xs text-red-500 mt-2">{startError}</p>
              )}
            </div>

            {/* User list */}
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {messageableUsers.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <User className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    {user?.role === 'student'
                      ? 'Enroll in courses to message their teachers.'
                      : 'No students enrolled in your courses yet.'}
                  </p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">No results for "{newChatSearch}"</p>
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => handleStartConversation(u._id)}
                    disabled={startingWith === u._id}
                    className="w-full flex items-center gap-3 px-6 py-3.5 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {getInitials(u.fullName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{u.fullName}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />{u.courseTitle}
                      </p>
                    </div>
                    {startingWith === u._id
                      ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    }
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}