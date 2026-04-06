import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useLessons } from '../hooks/useLessons';
import { useProgress } from '../hooks/useProgress';
import Navbar from '../components/Navbar';
import EmotionIndicator from '../components/EmotionIndicator';
import CameraConsentModal from '../components/CameraConsentModal';
import {
  Play, FileText, Camera, CameraOff,
  Download, ChevronDown, ChevronUp,
  Video, ArrowLeft, Link, Loader2,
  CheckCircle,
} from 'lucide-react';

interface RecordedCourseProps {
  courseId: string;
  courseTitle: string;
}

export default function RecordedCourse({ courseId, courseTitle }: RecordedCourseProps) {
  const { user } = useAuth();
  const { setCurrentPage } = useNavigation();
  const { lessons, loading } = useLessons(courseId);
  const { markLessonVisited } = useProgress(courseId, lessons.length);

  const [showConsentModal, setShowConsentModal] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<'engaged' | 'confused' | 'bored' | 'neutral'>('neutral');
  const [showResources, setShowResources] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);

  // ✅ Track which lessons have been visited (for UI checkmarks)
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  const currentLesson = lessons.find((l) => l._id === selectedLesson) || lessons[0] || null;

  // ✅ Mark first lesson as visited on mount
  useEffect(() => {
    if (lessons.length > 0 && lessons[0]) {
      const firstId = lessons[0]._id;
      markLessonVisited(firstId);
      setVisitedIds((prev) => new Set(prev).add(firstId));
    }
  }, [lessons]);

  const handleSelectLesson = (lessonId: string) => {
    setSelectedLesson(lessonId);
    markLessonVisited(lessonId);
    setVisitedIds((prev) => new Set(prev).add(lessonId));
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype === 'text/uri-list') return <Link className="w-5 h-5 text-blue-600" />;
    if (mimetype === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <Video className="w-5 h-5 text-blue-600" />;
  };

  const isVideo = (mimetype: string) =>
    ['video/mp4', 'video/webm', 'video/ogg'].includes(mimetype);

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const videoFile = currentLesson?.files.find((f) => isVideo(f.mimetype));

  // ✅ Progress percentage based on visited lessons
  const progressPercent = lessons.length > 0
    ? Math.round((visitedIds.size / lessons.length) * 100)
    : 0;

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
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{courseTitle}</h1>
            {currentLesson && (
              <p className="text-gray-600 mt-1">{currentLesson.title}</p>
            )}
          </div>

          {/* ✅ Progress indicator in header */}
          {lessons.length > 0 && (
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-gray-900">{progressPercent}% complete</p>
              <div className="w-32 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

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
                      key={videoFile.url}
                      src={videoFile.url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-gray-500">
                      <Play className="w-20 h-20 opacity-30 mx-auto mb-2" />
                      <p className="text-sm">No video in this lesson</p>
                    </div>
                  )}

                  {cameraEnabled && (
                    <div className="absolute top-4 right-4 w-24 h-24 bg-gray-800 rounded-lg border-2 border-blue-500 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-400" />
                    </div>
                  )}

                  <div className="absolute bottom-4 right-4">
                    {!cameraEnabled ? (
                      <button
                        onClick={() => setShowConsentModal(true)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-xs font-medium flex items-center gap-2 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        Enable AI Detection
                      </button>
                    ) : (
                      <button
                        onClick={() => setCameraEnabled(false)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-xs font-medium flex items-center gap-2 transition-colors"
                      >
                        <CameraOff className="w-4 h-4" />
                        Disable
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Emotion Timeline */}
              {cameraEnabled && (
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

              {/* About + Resources */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {currentLesson?.description && (
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">About This Lesson</h3>
                    <p className="text-gray-600 leading-relaxed">{currentLesson.description}</p>
                  </div>
                )}

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
                        currentLesson.files.map((file) => (
                          <a
                            key={file.publicId}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {getFileIcon(file.mimetype)}
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{file.originalName}</p>
                                {file.size > 0 && (
                                  <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                                )}
                              </div>
                            </div>
                            <Download className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                          </a>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right side panel */}
            <div className="space-y-6">

              {/* ✅ Progress bar in sidebar */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Your Progress</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {visitedIds.size} of {lessons.length} lessons
                  </span>
                  <span className="text-sm font-bold text-blue-600">{progressPercent}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {progressPercent === 100 && (
                  <div className="flex items-center gap-2 mt-3 text-green-600 text-sm font-medium">
                    <CheckCircle className="w-4 h-4" />
                    Course completed!
                  </div>
                )}
              </div>

              {/* Course Content / Lessons List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Course Content</h3>
                <div className="space-y-2">
                  {lessons.map((lesson, index) => {
                    const isCurrent = lesson._id === (currentLesson?._id);
                    const isVisited = visitedIds.has(lesson._id);
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
                          {/* ✅ Checkmark if visited, number if not */}
                          {isVisited ? (
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isCurrent ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
                            }`}>
                              {index + 1}
                            </span>
                          )}
                          <p className={`text-sm font-medium truncate ${
                            isCurrent ? 'text-blue-900' : isVisited ? 'text-green-700' : 'text-gray-900'
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
              {cameraEnabled && (
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