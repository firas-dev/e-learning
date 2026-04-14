import { useState, useEffect, useRef } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useLessons } from '../hooks/useLessons';
import { useProgress } from '../hooks/useProgress';
import { useLearningTimer } from '../hooks/useLearningTimer';
import Navbar from '../components/Navbar';
import EmotionIndicator from '../components/EmotionIndicator';
import CameraConsentModal from '../components/CameraConsentModal';
import {
  Play, FileText,
  Camera,
  ChevronDown, ChevronUp,
  Video, ArrowLeft, Link, Loader2,
  CheckCircle,
  Star,
  Eye,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CommentsAndRating, { CourseRatingInline, LessonRatingWidget } from '../components/CommentsAndRating';


interface RecordedCourseProps {
  courseId: string;
  courseTitle: string;
  onOpenPDF?: (url: string, fileName: string) => void;
}

export default function RecordedCourse({ courseId, courseTitle, onOpenPDF }: RecordedCourseProps) {
  const { } = useAuth();
  const { setCurrentPage } = useNavigation();
  const { lessons, loading } = useLessons(courseId);
  const {
    completedIds,
    progressPercent,
    hydrated,
    getVideoTimeUpdateHandler,
    forceCompleteLesson,
  } = useProgress(courseId, lessons.length);

  const { pause: pauseTimer, resume: resumeTimer } = useLearningTimer(courseId);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        videoRef.current?.pause();
        pauseTimer();
      } else {
        resumeTimer();
      }
    };

    const handleBlur = () => {
      videoRef.current?.pause();
      pauseTimer();
    };

    const handleFocus = () => resumeTimer();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [pauseTimer, resumeTimer]);

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
    const lesson = lessons.find((l) => l._id === lessonId);
    const hasVideo = lesson?.files.some((f) => isVideo(f.mimetype));
    if (!hasVideo) {
      forceCompleteLesson(lessonId);
    }
  };

  // Open PDF in the in-platform viewer
  const handleOpenFile = (file: { url: string; originalName: string; mimetype: string }) => {
    if (file.mimetype === 'application/pdf' && onOpenPDF) {
      onOpenPDF(file.url, file.originalName);
    } else {
      // For links and other types, open in new tab
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
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{courseTitle}</h1>
            {currentLesson && (
              <p className="text-gray-600 mt-1">{currentLesson.title}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 bg-white border border-gray-200 shadow-sm px-3 py-1.5 rounded-lg">    
  
  {/* Top row: label + star */}
  <div className="flex items-center gap-2">
    <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
    <span className="text-black-500 font-medium">Course Rating</span>
  </div>

  {/* Bottom row: rating */}
  <CourseRatingInline 
    courseId={courseId} 
    externalAverage={courseRating?.avg} 
    externalCount={courseRating?.cnt}
  />

</div>
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
                      ref={videoRef}
                      key={videoFile.url}
                      src={videoFile.url}
                      controls
                      controlsList="nodownload"
                      disablePictureInPicture
                      onContextMenu={(e) => e.preventDefault()}
                      className="w-full h-full object-contain"
                      onTimeUpdate={
                        currentLesson
                          ? getVideoTimeUpdateHandler(currentLesson._id)
                          : undefined
                      }
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

              {/* About + Lesson Rating + Resources */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {currentLesson?.description && (
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-6 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">About This Lesson</h3>
                        <p className="text-gray-600 leading-relaxed">{currentLesson.description}</p>
                      </div>
                      {/* Lesson rating only — course avg moved to header */}
                      <div className="flex-shrink-0 border-l border-gray-100 pl-9">
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
                <CommentsAndRating courseId={courseId} lessonId={currentLesson?._id} />
              </div>
            </div>

            {/* Right side panel */}
            <div className="space-y-6">

              {/* Progress bar */}
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

              {/* Course Content / Lessons List */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Course Content</h3>
                <div className="space-y-2">
                  {lessons.map((lesson, index) => {
                    const isCurrent = lesson._id === (currentLesson?._id);
                    const isCompleted = completedIds.has(lesson._id);
                    return (
                      <div
                        key={lesson._id}
                        id={`lesson-item-${lesson._id}`}
                        onClick={() => handleSelectLesson(lesson._id)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${isCurrent
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