import { useState, useEffect } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import Navbar from '../components/Navbar';
import {
  ArrowLeft, ZoomIn, ZoomOut, RotateCw,
  Download, Maximize2, Minimize2,
  ChevronLeft, ChevronRight, Loader2, AlertCircle,
} from 'lucide-react';

interface PDFViewerProps {
  url: string;
  fileName: string;
  courseId?: string;
  courseTitle?: string;
}

export default function PDFViewer({ url, fileName, courseTitle }: PDFViewerProps) {
  const { setCurrentPage } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(true);
  const [currentPage, setCurrentPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);

  // Build the Google Docs Viewer embed URL as a reliable cross-browser fallback
  // We use the native browser PDF embed first, and fall back if needed
  const encodedUrl = encodeURIComponent(url);
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;

  // Try native embed — most modern browsers support PDF rendering natively
  // We detect failure via the iframe's load event + a timeout heuristic
  const [useGoogleViewer, setUseGoogleViewer] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setCurrentPageNum(1);
    setZoom(100);
    setRotation(0);
  }, [url]);

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    if (!useGoogleViewer) {
      setUseGoogleViewer(true);
    } else {
      setError(true);
      setLoading(false);
    }
  };

  const zoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const zoomOut = () => setZoom((z) => Math.max(z - 25, 50));
  const rotate = () => setRotation((r) => (r + 90) % 360);

  const viewerUrl = useGoogleViewer ? googleViewerUrl : url;

  // Build the final src with zoom hint for native PDF viewers
  const iframeSrc = useGoogleViewer
    ? googleViewerUrl
    : `${url}#zoom=${zoom}&page=${currentPage}&toolbar=0&navpanes=0&scrollbar=1`;

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${fullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {!fullscreen}

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 flex-wrap sticky top-0 z-40 shadow-sm">
        {/* Back */}
        <button
          onClick={() => setCurrentPage('recorded-course')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mr-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Back to course</span>
        </button>

        <div className="w-px h-6 bg-gray-200" />

        {/* File name + course */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{fileName}</p>
          {courseTitle && (
            <p className="text-xs text-gray-500 truncate">{courseTitle}</p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Zoom controls — only for native viewer */}
          {!useGoogleViewer && (
            <>
              <button
                onClick={zoomOut}
                disabled={zoom <= 50}
                title="Zoom out"
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ZoomOut className="w-4 h-4 text-gray-600" />
              </button>

              <span className="text-xs font-medium text-gray-600 w-12 text-center tabular-nums">
                {zoom}%
              </span>

              <button
                onClick={zoomIn}
                disabled={zoom >= 200}
                title="Zoom in"
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ZoomIn className="w-4 h-4 text-gray-600" />
              </button>

              <div className="w-px h-5 bg-gray-200 mx-1" />

              <button
                onClick={rotate}
                title="Rotate"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <RotateCw className="w-4 h-4 text-gray-600" />
              </button>

              <div className="w-px h-5 bg-gray-200 mx-1" />
            </>
          )}

          {/* Fullscreen toggle */}
          <button
            onClick={() => setFullscreen((f) => !f)}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {fullscreen
              ? <Minimize2 className="w-4 h-4 text-gray-600" />
              : <Maximize2 className="w-4 h-4 text-gray-600" />
            }
          </button>
        </div>
      </div>

      {/* Viewer area */}
      <div className="flex-1 relative overflow-hidden bg-gray-100">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-gray-50">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Loading PDF…</p>
          </div>
        )}

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-md text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Unable to display PDF</h2>
              <p className="text-sm text-gray-500 mb-6">
                Your browser couldn't render this file inline. You can open it in a new tab instead.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Open PDF
              </a>
            </div>
          </div>
        ) : (
          <div
            className="w-full h-full transition-transform duration-200"
            style={{
              transform: `rotate(${rotation}deg)`,
              minHeight: 'calc(100vh - 120px)',
            }}
          >
            <iframe
              key={`${iframeSrc}-${zoom}`}
              src={iframeSrc}
              title={fileName}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="w-full border-0"
              style={{
                height: fullscreen
                  ? 'calc(100vh - 56px)'
                  : 'calc(100vh - 130px)',
                display: loading ? 'none' : 'block',
              }}
              allow="fullscreen"
            />
          </div>
        )}
      </div>

      {/* Footer bar */}
      {!error && !loading && (
        <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-center gap-3">
          <p className="text-xs text-gray-400">
            {useGoogleViewer
              ? 'Rendered via Google Docs Viewer'
              : 'Use the toolbar above to zoom and rotate'}
          </p>
          <span className="text-gray-200">·</span>
          
        </div>
      )}
    </div>
  );
}