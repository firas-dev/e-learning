import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useLiveSession } from '../hooks/useLiveSession';
import EmotionIndicator from '../components/EmotionIndicator';
import CameraConsentModal from '../components/CameraConsentModal';
import {
  Video, VideoOff, Mic, MicOff, MonitorUp,
  MessageSquare, Hand, Users, X, Send,
  AlertCircle, Paperclip, FileText, Image,
  Link, Trash2, Plus, Loader2,
} from 'lucide-react';

interface LiveClassProps {
  courseId: string;
  courseTitle: string;
}

export default function LiveClass({ courseId, courseTitle }: LiveClassProps) {
  const { user } = useAuth();
  const { setCurrentPage } = useNavigation();
  const isTeacher = user?.role === 'teacher';

  const {
    session, messages, loading, error,
    startSession, endSession,
    uploadAttachments, deleteAttachment,
    sendMessage, raiseHand,
  } = useLiveSession(courseId, user?.fullName || 'Anonymous');

  const [showConsentModal, setShowConsentModal] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showAttachments, setShowAttachments] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // Start session form (teacher)
  const [showStartForm, setShowStartForm] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [starting, setStarting] = useState(false);

  // Attachment upload
  const [showAttachPanel, setShowAttachPanel] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [links, setLinks] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setStarting(true);
    try {
      await startSession(sessionTitle || courseTitle);
      setShowStartForm(false);
    } finally {
      setStarting(false);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      await uploadAttachments(selectedFiles, links);
      setSelectedFiles([]);
      setLinks([]);
      setShowAttachPanel(false);
    } finally {
      setUploading(false);
    }
  };

  const addLink = () => {
    if (linkInput.trim()) {
      setLinks((prev) => [...prev, linkInput.trim()]);
      setLinkInput('');
    }
  };

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const getAttachmentIcon = (mimetype: string) => {
    if (mimetype === 'text/uri-list') return <Link className="w-4 h-4 text-blue-400" />;
    if (mimetype === 'application/pdf') return <FileText className="w-4 h-4 text-red-400" />;
    return <Image className="w-4 h-4 text-green-400" />;
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No active session
  if (!session) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          {isTeacher ? (
            <>
              <h2 className="text-white text-xl font-bold mb-2">No active session</h2>
              <p className="text-gray-400 mb-6">Start a live session for your students</p>
              {!showStartForm ? (
                <button
                  onClick={() => setShowStartForm(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
                >
                  Start Live Session
                </button>
              ) : (
                <form onSubmit={handleStartSession} className="bg-gray-800 rounded-xl p-6 w-80 mx-auto">
                  <h3 className="text-white font-semibold mb-4">Session Details</h3>
                  <input
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    placeholder={courseTitle}
                    className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowStartForm(false)}
                      className="flex-1 py-2 border border-gray-600 text-gray-300 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={starting}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {starting && <Loader2 className="w-4 h-4 animate-spin" />}
                      {starting ? 'Starting...' : 'Start'}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <>
              <h2 className="text-white text-xl font-bold mb-2">No live session right now</h2>
              <p className="text-gray-400 mb-6">Your teacher hasn't started a session yet</p>
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl"
              >
                Go Back
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {showConsentModal && (
        <CameraConsentModal
          onAccept={() => { setCameraEnabled(true); setShowConsentModal(false); }}
          onDecline={() => setShowConsentModal(false)}
        />
      )}

      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{session.title}</h1>
            <p className="text-sm text-gray-400">{courseTitle}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-white font-medium">LIVE</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Users className="w-5 h-5" />
              <span className="text-sm">{messages.length > 0 ? 'Active' : 'Waiting...'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">

          {/* Jitsi embed */}
          <div className="flex-1 relative">
            <iframe
              src={`https://meet.jit.si/${session.jitsiRoomId}`}
              className="w-full h-full border-0"
              allow="camera; microphone; fullscreen; display-capture"
              title="Live Session"
            />
          </div>

          {/* Controls */}
          <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <button
                onClick={() => setCameraEnabled(!cameraEnabled)}
                className={`p-4 rounded-full transition-colors ${cameraEnabled ? 'bg-gray-700' : 'bg-red-600'}`}
              >
                {cameraEnabled
                  ? <Video className="w-6 h-6 text-white" />
                  : <VideoOff className="w-6 h-6 text-white" />
                }
              </button>

              <button
                onClick={() => setMicEnabled(!micEnabled)}
                className={`p-4 rounded-full transition-colors ${micEnabled ? 'bg-gray-700' : 'bg-red-600'}`}
              >
                {micEnabled
                  ? <Mic className="w-6 h-6 text-white" />
                  : <MicOff className="w-6 h-6 text-white" />
                }
              </button>

              {isTeacher && (
                <button className="p-4 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors">
                  <MonitorUp className="w-6 h-6 text-white" />
                </button>
              )}

              {!isTeacher && (
                <button
                  onClick={() => { setHandRaised(!handRaised); raiseHand(); }}
                  className={`p-4 rounded-full transition-colors ${handRaised ? 'bg-yellow-600' : 'bg-gray-700'}`}
                >
                  <Hand className="w-6 h-6 text-white" />
                </button>
              )}

              <button
                onClick={() => { setShowChat(!showChat); setShowAttachments(false); }}
                className={`p-4 rounded-full transition-colors ${showChat ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                <MessageSquare className="w-6 h-6 text-white" />
              </button>

              <button
                onClick={() => { setShowAttachments(!showAttachments); setShowChat(false); }}
                className={`p-4 rounded-full transition-colors ${showAttachments ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                <Paperclip className="w-6 h-6 text-white" />
              </button>

              <button
                onClick={async () => {
                  if (isTeacher) await endSession();
                  setCurrentPage('dashboard');
                }}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-full text-white font-medium transition-colors ml-auto"
              >
                {isTeacher ? 'End Session' : 'Leave'}
              </button>
            </div>
          </div>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold">Chat</h3>
              <button onClick={() => setShowChat(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-gray-500 text-sm text-center mt-8">No messages yet</p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{msg.user}</span>
                    <span className="text-xs text-gray-400">{msg.time}</span>
                  </div>
                  <p className="text-sm text-gray-300">{msg.message}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { sendMessage(newMessage); setNewMessage(''); }
                  }}
                  placeholder="Message..."
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg text-sm outline-none"
                />
                <button
                  onClick={() => { sendMessage(newMessage); setNewMessage(''); }}
                  className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Attachments Panel */}
        {showAttachments && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold">Attachments</h3>
              <button onClick={() => setShowAttachments(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {session.attachments.length === 0 && (
                <p className="text-gray-500 text-sm text-center mt-8">No attachments yet</p>
              )}
              {session.attachments.map((att) => (
                <div
                  key={att.publicId}
                  className="flex items-center justify-between bg-gray-700 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getAttachmentIcon(att.mimetype)}
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-400 hover:underline truncate"
                    >
                      {att.originalName}
                    </a>
                  </div>
                  {isTeacher && (
                    <button
                      onClick={() => deleteAttachment(att.publicId)}
                      className="ml-2 text-gray-400 hover:text-red-400 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Upload panel — teacher only */}
            {isTeacher && (
              <div className="border-t border-gray-700 p-4">
                {!showAttachPanel ? (
                  <button
                    onClick={() => setShowAttachPanel(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" /> Add Attachment
                  </button>
                ) : (
                  <div className="space-y-3">
                    {/* File upload */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-lg p-3 text-center cursor-pointer transition-colors"
                    >
                      <Paperclip className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">PDF or Images</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                    />

                    {selectedFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-gray-300 bg-gray-700 px-2 py-1 rounded">
                        <span className="truncate">{f.name}</span>
                        <button onClick={() => setSelectedFiles((p) => p.filter((_, idx) => idx !== i))}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {/* Link input */}
                    <div className="flex gap-2">
                      <input
                        value={linkInput}
                        onChange={(e) => setLinkInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addLink()}
                        placeholder="Paste a link..."
                        className="flex-1 px-2 py-1 bg-gray-700 text-white rounded text-xs outline-none"
                      />
                      <button
                        onClick={addLink}
                        className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs"
                      >
                        Add
                      </button>
                    </div>

                    {links.map((l, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-blue-400 bg-gray-700 px-2 py-1 rounded">
                        <span className="truncate">{l}</span>
                        <button onClick={() => setLinks((p) => p.filter((_, idx) => idx !== i))}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowAttachPanel(false); setSelectedFiles([]); setLinks([]); }}
                        className="flex-1 py-1.5 border border-gray-600 text-gray-300 rounded text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpload}
                        disabled={uploading || (selectedFiles.length === 0 && links.length === 0)}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {uploading && <Loader2 className="w-3 h-3 animate-spin" />}
                        {uploading ? 'Uploading...' : 'Upload'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}