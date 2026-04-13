import { useState, useRef } from 'react';
import { useLessons } from '../hooks/useLessons';
import Navbar from '../components/Navbar';
import { useNavigation } from '../contexts/NavigationContext';
import {
  Plus, Trash2, Upload, FileText, Video,
  ChevronDown, ChevronUp, ArrowLeft, X, Loader2,
  Eye,
} from 'lucide-react';

interface CourseLessonsProps {
  courseId: string;
  courseTitle: string;
}

export default function CourseLessons({ courseId, courseTitle }: CourseLessonsProps) {
  const { setCurrentPage } = useNavigation();
  const { lessons, loading, error, createLesson, deleteLesson, addFiles, deleteFile } =
    useLessons(courseId);

  const [showForm, setShowForm] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFileRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await createLesson(lessonTitle, lessonDesc, lessons.length + 1, selectedFiles);
      setLessonTitle('');
      setLessonDesc('');
      setSelectedFiles([]);
      setShowForm(false);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to create lesson.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFiles = async (lessonId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingFor(lessonId);
    try {
      await addFiles(lessonId, Array.from(files));
    } finally {
      setUploadingFor(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{courseTitle}</h1>
            <p className="text-gray-500 text-sm">
              {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Lesson
          </button>
        </div>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {/* Create Lesson Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">New Lesson</h2>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lesson Title
                </label>
                <input
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Introduction to Variables"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={lessonDesc}
                  onChange={(e) => setLessonDesc(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="What will students learn in this lesson?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Files <span className="text-gray-400">(PDF or Video)</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg p-6 text-center cursor-pointer transition-colors"
                >
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Click to browse or drag & drop</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, MP4, WebM — max 500MB each</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,video/*"
                  className="hidden"
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                />

                {selectedFiles.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {selectedFiles.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          {f.type.includes('pdf')
                            ? <FileText className="w-4 h-4 text-red-500" />
                            : <Video className="w-4 h-4 text-blue-500" />
                          }
                          <span className="truncate max-w-xs">{f.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <span>{formatSize(f.size)}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i))
                            }
                          >
                            <X className="w-4 h-4 hover:text-red-500" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Uploading to Cloudinary...' : 'Create Lesson'}
              </button>
            </form>
          </div>
        )}

        {/* Lessons List */}
        {lessons.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No lessons yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Add your first lesson
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, index) => (
              <div
                key={lesson._id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                {/* Lesson Row */}
                <div className="flex items-center gap-4 p-4">
                  <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                    {lesson.description && (
                      <p className="text-sm text-gray-500 truncate">{lesson.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {lesson.files.length} file{lesson.files.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpanded(expanded === lesson._id ? null : lesson._id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {expanded === lesson._id
                        ? <ChevronUp className="w-4 h-4 text-gray-500" />
                        : <ChevronDown className="w-4 h-4 text-gray-500" />
                      }
                    </button>
                    <button
                      onClick={() => deleteLesson(lesson._id)}
                      className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Files Panel */}
                {expanded === lesson._id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    <>
                      {lesson.files.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-2">No files yet</p>
                      ) : (
                        <ul className="space-y-2 mb-4">
                          {lesson.files.map((file) => (
                            <li
                              key={file.publicId}
                              className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {file.mimetype.includes('pdf')
                                  ? <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                                  : <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                }
                                {/* View link — no download attribute */}
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline truncate max-w-xs"
                                >
                                  {file.originalName}
                                </a>
                              </div>
                              <div className="flex items-center gap-3 text-gray-400 flex-shrink-0">
                                <span className="text-xs">{formatSize(file.size)}</span>
                                {/* Eye icon for preview */}
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:text-blue-500"
                                  title="Preview"
                                >
                                  <Eye className="w-4 h-4" />
                                </a>
                                <button
                                  onClick={() =>
                                    deleteFile(lesson._id, file.publicId, file.mimetype)
                                  }
                                  title="Delete file"
                                >
                                  <X className="w-4 h-4 hover:text-red-500" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}

                      <button
                        onClick={() => {
                          addFileRef.current?.setAttribute('data-lesson', lesson._id);
                          addFileRef.current?.click();
                        }}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {uploadingFor === lesson._id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Upload className="w-4 h-4" />
                        }
                        Upload more files
                      </button>
                    </>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input for adding to existing lesson */}
        <input
          ref={addFileRef}
          type="file"
          multiple
          accept=".pdf,video/*"
          className="hidden"
          onChange={(e) => {
            const lessonId = addFileRef.current?.getAttribute('data-lesson');
            if (lessonId) handleAddFiles(lessonId, e.target.files);
          }}
        />
      </div>
    </div>
  );
}