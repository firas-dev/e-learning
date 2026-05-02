import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import BannedScreen from './pages/BannedScreen';
import { NavigationProvider } from './contexts/NavigationContext';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LiveClass from './pages/LiveClass';
import RecordedCourse from './pages/RecordedCourse';
import PrivacySettings from './pages/PrivacySettings';
import CourseLessons from './pages/CourseLessons';
import CourseCatalog from './pages/CourseCatalog';
import TeacherProfile from './pages/TeacherProfile';
import TeacherPublicProfile from './pages/TeacherPublicProfile';
import StudentProfile from './pages/StudentProfile';
import PDFViewer from './pages/PdfViewer';
import Messaging from './pages/Messaging';
import TeacherPrivateRooms from './pages/TeacherPrivateRooms';
import StudentPrivateRooms from './pages/StudentPrivateRooms';

function AppContent() {
  const { user, loading } = useAuth();

  const [currentPage, setCurrentPage] = useState<string>(() => {
    return sessionStorage.getItem('currentPage') || 'dashboard';
  });

  const [selectedCourse, setSelectedCourse] = useState<{
    id: string;
    title: string;
    type?: 'live' | 'recorded';
  } | null>(() => {
    const stored = sessionStorage.getItem('selectedCourse');
    return stored ? JSON.parse(stored) : null;
  });

  const [selectedPDF, setSelectedPDF] = useState<{
    url: string;
    fileName: string;
  } | null>(() => {
    const stored = sessionStorage.getItem('selectedPDF');
    return stored ? JSON.parse(stored) : null;
  });

  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(() => {
    return sessionStorage.getItem('selectedTeacherId') || null;
  });

  const [isResetPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('token') && window.location.pathname === '/reset-password';
  });

  const handleSetCurrentPage = (page: string) => {
    sessionStorage.setItem('currentPage', page);
    setCurrentPage(page);
  };

  const handleSetSelectedCourse = (
    course: { id: string; title: string; type?: 'live' | 'recorded' } | null
  ) => {
    if (course) sessionStorage.setItem('selectedCourse', JSON.stringify(course));
    else sessionStorage.removeItem('selectedCourse');
    setSelectedCourse(course);
  };

  const handleOpenPDF = (url: string, fileName: string) => {
    const pdf = { url, fileName };
    sessionStorage.setItem('selectedPDF', JSON.stringify(pdf));
    setSelectedPDF(pdf);
    handleSetCurrentPage('pdf-viewer');
  };

  const handleViewTeacherProfile = (teacherId: string) => {
    sessionStorage.setItem('selectedTeacherId', teacherId);
    setSelectedTeacherId(teacherId);
    handleSetCurrentPage('teacher-public-profile');
  };

  const handleGoToMessages = (_teacherId?: string) => {
    handleSetCurrentPage('messages');
  };

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ── Password reset page ────────────────────────────────────────────────
  if (isResetPage) {
    return (
      <ResetPassword
        onBack={() => {
          window.history.replaceState({}, '', '/');
          handleSetCurrentPage('dashboard');
        }}
      />
    );
  }

  // ── Not authenticated ──────────────────────────────────────────────────
  if (!user) {
    sessionStorage.removeItem('currentPage');
    sessionStorage.removeItem('selectedCourse');
    sessionStorage.removeItem('selectedPDF');
    sessionStorage.removeItem('selectedTeacherId');
    return <Login />;
  }

  // ── BANNED — show suspended screen, nothing else ───────────────────────
  if (user.isBanned) {
    return <BannedScreen banExpiresAt={user.banExpiresAt ?? null} />;
  }

  // ── PDF Viewer ─────────────────────────────────────────────────────────
  if (currentPage === 'pdf-viewer' && selectedPDF) {
    return (
      <NavigationProvider currentPage={currentPage} setCurrentPage={handleSetCurrentPage}>
        <PDFViewer
          url={selectedPDF.url}
          fileName={selectedPDF.fileName}
          courseId={selectedCourse?.id}
          courseTitle={selectedCourse?.title}
        />
      </NavigationProvider>
    );
  }

  // ── Course Lessons ─────────────────────────────────────────────────────
  if (currentPage === 'course-lessons' && selectedCourse) {
    return (
      <NavigationProvider currentPage={currentPage} setCurrentPage={handleSetCurrentPage}>
        <CourseLessons courseId={selectedCourse.id} courseTitle={selectedCourse.title} />
      </NavigationProvider>
    );
  }

  // ── Live Class ─────────────────────────────────────────────────────────
  if (currentPage === 'live-class' && selectedCourse) {
    return (
      <NavigationProvider currentPage={currentPage} setCurrentPage={handleSetCurrentPage}>
        <LiveClass courseId={selectedCourse.id} courseTitle={selectedCourse.title} />
      </NavigationProvider>
    );
  }

  // ── Recorded Course ────────────────────────────────────────────────────
  if (currentPage === 'recorded-course' && selectedCourse) {
    return (
      <NavigationProvider currentPage={currentPage} setCurrentPage={handleSetCurrentPage}>
        <RecordedCourse
          courseId={selectedCourse.id}
          courseTitle={selectedCourse.title}
          onOpenPDF={handleOpenPDF}
          onViewTeacherProfile={user.role === 'student' ? handleViewTeacherProfile : undefined}
        />
      </NavigationProvider>
    );
  }

  // ── Teacher public profile ─────────────────────────────────────────────
  if (currentPage === 'teacher-public-profile' && selectedTeacherId && user.role === 'student') {
    return (
      <NavigationProvider currentPage={currentPage} setCurrentPage={handleSetCurrentPage}>
        <TeacherPublicProfile
          teacherId={selectedTeacherId}
          onStartConversation={(tid) => handleGoToMessages(tid)}
        />
      </NavigationProvider>
    );
  }

  // ── Main app ───────────────────────────────────────────────────────────
  return (
    <NavigationProvider currentPage={currentPage} setCurrentPage={handleSetCurrentPage}>
      {currentPage === 'dashboard' && user?.role === 'student' && (
        <StudentDashboard
          onOpenCourse={(id, title, type) => {
            handleSetSelectedCourse({ id: String(id), title, type });
            handleSetCurrentPage(type === 'live' ? 'live-class' : 'recorded-course');
          }}
        />
      )}
      {currentPage === 'dashboard' && user?.role === 'teacher' && (
        <TeacherDashboard
          onOpenCourse={(id, title, type) => {
            handleSetSelectedCourse({ id: String(id), title, type });
            handleSetCurrentPage(type === 'live' ? 'live-class' : 'recorded-course');
          }}
        />
      )}
      {currentPage === 'dashboard' && user?.role === 'admin' && <AdminDashboard />}
      {currentPage === 'catalog'   && user?.role === 'student' && (
        <CourseCatalog onViewTeacherProfile={handleViewTeacherProfile} />
      )}
      {currentPage === 'privacy'   && <PrivacySettings />}
      {currentPage === 'profile'   && user?.role === 'teacher' && <TeacherProfile />}
      {currentPage === 'profile'   && user?.role === 'student' && <StudentProfile />}
      {currentPage === 'messages'  && <Messaging />}
      {currentPage === 'private-rooms' && user?.role === 'teacher' && <TeacherPrivateRooms />}
      {currentPage === 'private-rooms' && user?.role === 'student' && <StudentPrivateRooms />}
    </NavigationProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;