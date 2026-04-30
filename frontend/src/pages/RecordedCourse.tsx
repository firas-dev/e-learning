import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useLessons } from '../hooks/useLessons';
import { useProgress } from '../hooks/useProgress';
import { useLearningTimer } from '../hooks/useLearningTimer';
import Navbar from '../components/Navbar';
import CameraConsentModal from '../components/CameraConsentModal';
import EmotionIndicator from '../components/EmotionIndicator';
import {
  Play, FileText,
  Camera,
  ChevronDown, ChevronUp,
  Video, ArrowLeft, Link, Loader2,
  CheckCircle,
  Star,
  Eye,
  Users,
  BookOpen,
  ExternalLink,
  Plus,   
  X,      
  Upload, 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CommentsAndRating, { CourseRatingInline, LessonRatingWidget } from '../components/CommentsAndRating';
import axios from 'axios';

const API = 'http://localhost:5000/api';

interface TeacherInfo {
  _id: string;
  fullName: string;
  email: string;
}

interface RecordedCourseProps {
  courseId: string;
  courseTitle: string;
  onOpenPDF?: (url: string, fileName: string) => void;
  onViewTeacherProfile?: (teacherId: string) => void;
}

export default function RecordedCourse({ courseId, courseTitle, onOpenPDF, onViewTeacherProfile }: RecordedCourseProps) {
  const { user } = useAuth();
  const { setCurrentPage } = useNavigation();
  const { lessons, loading, createLesson } = useLessons(courseId);
  // Add-lesson form (teacher only)
    const [showAddLesson, setShowAddLesson] = useState(false);
    const [newTitle, setNewTitle]           = useState('');
    const [newDesc, setNewDesc]             = useState('');
    const [newFiles, setNewFiles]           = useState<File[]>([]);
    const [addingLesson, setAddingLesson]   = useState(false);
    const [addLessonError, setAddLessonError] = useState('');
    const addLessonFileRef = useRef<HTMLInputElement>(null);

    const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLessonError('');
    setAddingLesson(true);
    try {
      await createLesson(newTitle, newDesc, lessons.length + 1, newFiles);
      setNewTitle('');
      setNewDesc('');
      setNewFiles([]);
      setShowAddLesson(false);
    } catch (err: any) {
      setAddLessonError(err?.response?.data?.message || 'Failed to create lesson.');
    } finally {
      setAddingLesson(false);
    }
    };
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const {
    completedIds,
    progressPercent,
    hydrated,
    getVideoTimeUpdateHandler,
    forceCompleteLesson,
  } = useProgress(isStudent ? courseId : '', lessons.length);

  //const { pause: pauseTimer, resume: resumeTimer } = useLearningTimer(isStudent ? courseId : undefined);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch teacher info for this course
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);

  useEffect(() => {
    if (!isStudent || !courseId) return;
    axios.get(`${API}/courses/${courseId}/teacher`)
      .then((res) => setTeacherInfo(res.data))
      .catch(() => {});
  }, [courseId, isStudent]);

  /*useEffect(() => {
    if (!isStudent) return;
    const handleVisibilityChange = () => {
      if (document.hidden) { videoRef.current?.pause(); pauseTimer(); }
      else resumeTimer();
    };
    const handleBlur = () => { videoRef.current?.pause(); pauseTimer(); };
    const handleFocus = () => resumeTimer();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [pauseTimer, resumeTimer, isStudent]);
*/

      // Track actual seconds of video played this session (not wall-clock time)
    const videoPlayedSeconds = useRef<number>(0);
    const lastVideoTime = useRef<number | null>(null);
    const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const flushVideoTime = useCallback(async () => {
      const seconds = Math.floor(videoPlayedSeconds.current);
      if (seconds < 60) return; // minimum 1 minute before flushing
      const deltaMinutes = Math.floor(seconds / 60);
      videoPlayedSeconds.current -= deltaMinutes * 60;
      try {
        await axios.patch(`${API}/student/courses/${courseId}/learning-time`, { deltaMinutes });
      } catch (_) {}
    }, [courseId]);

    // Start/stop periodic flush
    useEffect(() => {
      if (!isStudent) return;
      flushIntervalRef.current = setInterval(flushVideoTime, 60_000);
      return () => {
        if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);
        // Final flush on unmount via sendBeacon
        const remaining = Math.floor(videoPlayedSeconds.current / 60);
        if (remaining >= 1) {
          navigator.sendBeacon(
            `${API}/student/courses/${courseId}/learning-time`,
            JSON.stringify({ deltaMinutes: remaining })
          );
        }
      };
    }, [isStudent, courseId, flushVideoTime]);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [currentEmotion] = useState<'engaged' | 'confused' | 'bored' | 'neutral'>('neutral');
  const [showResources, setShowResources] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [courseRating, setCourseRating] = useState<{ avg: number; cnt: number } | null>(null);

  const currentLesson = lessons.find((l) => l._id === selectedLesson) || lessons[0] || null;

  const isVideo = (mimetype: string) =>
    ['video/mp4', 'video/webm', 'video/ogg'].includes(mimetype);

  const videoFile = currentLesson?.files.find((f) => isVideo(f.mimetype));

  const getFileIcon = (mimetype: string) => {
    if (mimetype === 'text/uri-list') return <Link className="w-5 h-5 text-blue-600" />;
    if (mimetype === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <Video className="w-5 h-5 text-blue-600" />;
  };

  const handleSelectLesson = (lessonId: string) => {
    setSelectedLesson(lessonId);
    if (isStudent) {
      const lesson = lessons.find((l) => l._id === lessonId);
      const hasVideo = lesson?.files.some((f) => isVideo(f.mimetype));
      if (!hasVideo) forceCompleteLesson(lessonId);
    }
  };

  const handleOpenFile = (file: { url: string; originalName: string; mimetype: string }) => {
    if (file.mimetype === 'application/pdf' && onOpenPDF) {
      onOpenPDF(file.url, file.originalName);
    } else {
      window.open(file.url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {showConsentModal && (
        <CameraConsentModal
          onAccept={() => { setCameraEnabled(true); setShowConsentModal(false); }}
          onDecline={() => setShowConsentModal(false)}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-3xl font-bold text-gray-900 truncate">{courseTitle}</h1>
              {isTeacher && (
                <span className="flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full font-medium border border-indigo-200">
                  <BookOpen className="w-3 h-3" />
                  Teacher Preview
                </span>
              )}
            </div>
            {currentLesson && (
              <p className="text-gray-600 mt-1 truncate">{currentLesson.title}</p>
            )}
          </div>

          {/* Course Rating */}
          <div className="flex-shrink-0 flex flex-col gap-1.5 bg-white border border-gray-200 shadow-sm px-3 py-1.5 rounded-lg">
            <div className="flex items-center gap-2">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-gray-600 font-medium text-sm">Course Rating</span>
            </div>
            <CourseRatingInline
              courseId={courseId}
              externalAverage={courseRating?.avg}
              externalCount={courseRating?.cnt}
            />
          </div>
        </div>

        {/* Teacher info banner — students only */}
        {isStudent && teacherInfo && (
          <div className="mb-6 p-4 bg-white border border-gray-200 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {teacherInfo.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'T'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500">Instructor</p>
              <p className="font-semibold text-gray-900">{teacherInfo.fullName}</p>
            </div>
            {onViewTeacherProfile && (
              <button
                onClick={() => onViewTeacherProfile(teacherInfo._id)}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View profile
              </button>
            )}
          </div>
        )}

        {/* Teacher info banner — for teacher role */}
{isTeacher && (
  <div className="mb-6 space-y-4">
    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <Users className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-indigo-800">You're viewing this course as its teacher.</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            You can preview all lesson content, view student discussions, reply to comments, and delete inappropriate messages.
          </p>
        </div>
      </div>
      <button
        onClick={() => setShowAddLesson((v) => !v)}
        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Lesson
      </button>
    </div>

    {/* Add lesson form */}
    {showAddLesson && (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">New Lesson</h2>
          <button onClick={() => setShowAddLesson(false)}>
            <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleAddLesson} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Title</label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g. Introduction to Variables"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              placeholder="What will students learn in this lesson?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Files (optional)</label>
            <input
              ref={addLessonFileRef}
              type="file"
              multiple
              accept="video/*,application/pdf"
              className="hidden"
              onChange={(e) => setNewFiles(Array.from(e.target.files || []))}
            />
            <button
              type="button"
              onClick={() => addLessonFileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              <Upload className="w-4 h-4" />
              {newFiles.length > 0 ? `${newFiles.length} file(s) selected` : 'Upload videos / PDFs'}
            </button>
            {newFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {newFiles.map((f, i) => (
                  <li key={i} className="text-xs text-gray-500 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {f.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {addLessonError && <p className="text-sm text-red-500">{addLessonError}</p>}
          <button
            type="submit"
            disabled={addingLesson}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {addingLesson && <Loader2 className="w-4 h-4 animate-spin" />}
            {addingLesson ? 'Uploading...' : 'Create Lesson'}
          </button>
        </form>
      </div>
    )}
  </div>
)}

        {lessons.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Video className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No lessons available for this course yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

              {/* Video Player */}
              <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg">
                <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  {videoFile ? (
                    <video
                      ref={videoRef}
                      key={videoFile.url}
                      src={videoFile.url}
                      controls
                      controlsList="nodownload"
                      disablePictureInPicture
                      onContextMenu={(e) => e.preventDefault()}
                      className="w-full h-full object-contain"
                      /*onTimeUpdate={
                        isStudent && currentLesson
                          ? getVideoTimeUpdateHandler(currentLesson._id)
                          : undefined
                      }*/
                        onPlay={() => { lastVideoTime.current = videoRef.current?.currentTime ?? 0; }}
                        onPause={() => { lastVideoTime.current = null; }}
                        onSeeking={() => { lastVideoTime.current = null; }}
                        onSeeked={() => { lastVideoTime.current = videoRef.current?.currentTime ?? null; }}
                      onTimeUpdate={isStudent && currentLesson ? (e) => {
                        const video = e.currentTarget;
                        // Accumulate genuinely played seconds (not seeking)
                        if (!video.seeking && lastVideoTime.current !== null) {
                          const delta = video.currentTime - lastVideoTime.current;
                          if (delta > 0 && delta < 2) { // ignore big jumps (seeks)
                            videoPlayedSeconds.current += delta;
                          }
                        }
                        lastVideoTime.current = video.currentTime;
                        // Also call the original progress/completion tracker
                        getVideoTimeUpdateHandler(currentLesson._id)(e);
                      } : undefined}
                    />
                  ) : (
                    <div className="text-center text-gray-500">
                      <Play className="w-20 h-20 opacity-30 mx-auto mb-2" />
                      <p className="text-sm">No video in this lesson</p>
                    </div>
                  )}

                  {cameraEnabled && isStudent && (
                    <div className="absolute top-4 right-4 w-24 h-24 bg-gray-800 rounded-lg border-2 border-blue-500 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Emotion Timeline */}
              {cameraEnabled && isStudent && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Emotion Timeline</h3>
                  <div className="relative h-24 bg-gray-50 rounded-lg p-4 flex items-end gap-1">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-t ${Math.random() > 0.6 ? 'bg-green-500' : 'bg-gray-300'}`}
                        style={{ height: `${20 + Math.random() * 60}%` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* About + Lesson Rating + Resources */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {currentLesson?.description && (
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-6 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">About This Lesson</h3>
                        <p className="text-gray-600 leading-relaxed">{currentLesson.description}</p>
                      </div>
                      {isStudent && (
                        <div className="flex-shrink-0 border-l border-gray-100 pl-6">
                          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Rate this lesson
                          </p>
                          {currentLesson && (
                            <LessonRatingWidget
                              courseId={courseId}
                              lessonId={currentLesson._id}
                              onCourseUpdate={(avg, cnt) => setCourseRating({ avg, cnt })}
                            />
                          )}
                        </div>
                      )}
                      {isTeacher && (
                        <div className="flex-shrink-0 border-l border-gray-100 pl-6">
                          <p className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Lesson rating
                          </p>
                          <p className="text-xs text-gray-400">(Student ratings shown in course header)</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Resources */}
                <div className="border-t border-gray-200 p-6">
                  <button
                    onClick={() => setShowResources(!showResources)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <h3 className="text-lg font-bold text-gray-900">
                      Resources
                      {currentLesson && (
                        <span className="ml-2 text-sm font-normal text-gray-400">
                          ({currentLesson.files.length} files)
                        </span>
                      )}
                    </h3>
                    {showResources
                      ? <ChevronUp className="w-5 h-5 text-gray-400" />
                      : <ChevronDown className="w-5 h-5 text-gray-400" />
                    }
                  </button>

                  {showResources && currentLesson && (
                    <div className="mt-4 space-y-3">
                      {currentLesson.files.length === 0 ? (
                        <p className="text-sm text-gray-400">No files in this lesson.</p>
                      ) : (
                        currentLesson.files.map((file) => {
                          const isPdf = file.mimetype === 'application/pdf';
                          const isLink = file.mimetype === 'text/uri-list';
                          const isViewable = isPdf || isLink;

                          return (
                            <div
                              key={file.publicId}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {getFileIcon(file.mimetype)}
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900 text-sm truncate">
                                    {file.originalName}
                                  </p>
                                  {isPdf && (
                                    <p className="text-xs text-gray-400 mt-0.5">PDF document</p>
                                  )}
                                </div>
                              </div>

                              {isViewable && (
                                <button
                                  onClick={() => handleOpenFile(file)}
                                  className="ml-3 flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-medium transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  {isPdf ? 'Open PDF' : 'View'}
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Discussion / Comments */}
                <CommentsAndRating
                  courseId={courseId}
                  lessonId={currentLesson?._id}
                  readOnlyMode={isTeacher}
                />
              </div>
            </div>

            {/* Right side panel */}
            <div className="space-y-6">

              {/* Progress bar — students only */}
              {isStudent && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Your Progress</h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      {completedIds.size} of {lessons.length} lessons
                    </span>
                    <span className="text-sm font-bold text-blue-600">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  {!hydrated && (
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Syncing progress…
                    </p>
                  )}
                  {progressPercent === 100 && (
                    <div className="flex items-center gap-2 mt-3 text-green-600 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Course completed!
                    </div>
                  )}
                </div>
              )}

              {/* Teacher card — students only */}
              {isStudent && teacherInfo && onViewTeacherProfile && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">About the instructor</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                      {teacherInfo.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'T'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{teacherInfo.fullName}</p>
                      <p className="text-xs text-gray-500">{teacherInfo.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onViewTeacherProfile(teacherInfo._id)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View instructor profile
                  </button>
                </div>
              )}

              {/* Teacher stats panel */}
              {isTeacher && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    Course Overview
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-500">Total lessons</span>
                      <span className="font-semibold text-gray-900">{lessons.length}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-500">Files uploaded</span>
                      <span className="font-semibold text-gray-900">
                        {lessons.reduce((acc, l) => acc + l.files.length, 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-500">Video lessons</span>
                      <span className="font-semibold text-gray-900">
                        {lessons.filter(l => l.files.some(f => ['video/mp4','video/webm','video/ogg'].includes(f.mimetype))).length}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Course Content / Lessons List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Course Content</h3>
                <div className="space-y-2">
                  {lessons.map((lesson, index) => {
                    const isCurrent = lesson._id === (currentLesson?._id);
                    const isCompleted = isStudent && completedIds.has(lesson._id);
                    return (
                      <div
                        key={lesson._id}
                        onClick={() => handleSelectLesson(lesson._id)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          isCurrent
                            ? 'bg-blue-50 border-2 border-blue-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isCurrent ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
                            }`}>
                              {index + 1}
                            </span>
                          )}
                          <p className={`text-sm font-medium truncate ${
                            isCurrent ? 'text-blue-900' : isCompleted ? 'text-green-700' : 'text-gray-900'
                          }`}>
                            {lesson.title}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 ml-7">
                          {lesson.files.length} file{lesson.files.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI Monitoring */}
              {cameraEnabled && isStudent && (
                <div className="bg-green-50 border-2 border-green-500 rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-green-900 mb-2">AI Monitoring Active</h3>
                  <p className="text-sm text-green-700 mb-4">
                    Your emotions are being tracked to enhance your learning
                  </p>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                    <EmotionIndicator emotion={currentEmotion} size="md" />
                    <div>
                      <p className="font-semibold text-gray-900 capitalize">{currentEmotion}</p>
                      <p className="text-xs text-gray-600">Current state</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}