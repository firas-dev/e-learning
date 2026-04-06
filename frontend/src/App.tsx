import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import { NavigationProvider } from './contexts/NavigationContext';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LiveClass from './pages/LiveClass';
import RecordedCourse from './pages/RecordedCourse';
import PrivacySettings from './pages/PrivacySettings';
import CourseLessons from './pages/CourseLessons';
import CourseCatalog from './pages/CourseCatalog';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedCourse, setSelectedCourse] = useState<{
    id: string;
    title: string;
    type?: 'live' | 'recorded';
  } | null>(null);

  const [isResetPage, setIsResetPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('token') && window.location.pathname === '/reset-password';
  });

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

  if (isResetPage) {
    return (
      <ResetPassword
        onBack={() => {
          setIsResetPage(false);
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  }

  if (!user) return <Login />;

  // ── Course Lessons page (teacher) ──
  if (currentPage === 'course-lessons' && selectedCourse) {
    return (
      <NavigationProvider currentPage={currentPage} setCurrentPage={setCurrentPage}>
        <CourseLessons courseId={selectedCourse.id} courseTitle={selectedCourse.title} />
      </NavigationProvider>
    );
  }

  // ── Live Class page ──
  if (currentPage === 'live-class' && selectedCourse) {
    return (
      <NavigationProvider currentPage={currentPage} setCurrentPage={setCurrentPage}>
        <LiveClass courseId={selectedCourse.id} courseTitle={selectedCourse.title} />
      </NavigationProvider>
    );
  }

  // ── Recorded Course page ──
  if (currentPage === 'recorded-course' && selectedCourse) {
    return (
      <NavigationProvider currentPage={currentPage} setCurrentPage={setCurrentPage}>
        <RecordedCourse courseId={selectedCourse.id} courseTitle={selectedCourse.title} />
      </NavigationProvider>
    );
  }

  return (
    <NavigationProvider currentPage={currentPage} setCurrentPage={setCurrentPage}>

      {/* Student Dashboard */}
      {currentPage === 'dashboard' && user?.role === 'student' && (
        <StudentDashboard
          onOpenCourse={(id, title, type) => {
            setSelectedCourse({ id: String(id), title, type });
            setCurrentPage(type === 'live' ? 'live-class' : 'recorded-course');
          }}
        />
      )}

      {/* Teacher Dashboard */}
      {currentPage === 'dashboard' && user?.role === 'teacher' && (
        <TeacherDashboard
        onOpenCourse={(id, title, type) => {
          setSelectedCourse({ id: String(id), title, type });
          setCurrentPage(type === 'live' ? 'live-class' : 'course-lessons');
        }}
      />
      )}

      {/* Admin Dashboard */}
      {currentPage === 'dashboard' && user?.role === 'admin' && <AdminDashboard />}
      {currentPage === 'catalog' && user?.role === 'student' && <CourseCatalog />}
      {currentPage === 'privacy' && <PrivacySettings />}

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