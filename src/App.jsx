import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Public Pages
import IndexPage from './pages/public/IndexPage';
import LandingPage from './pages/public/LandingPage';
import AboutPage from './pages/public/AboutPage';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Citizen Pages
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import SubmitComplaint from './pages/citizen/SubmitComplaint';
import MyComplaints from './pages/citizen/MyComplaints';
import ComplaintDetail from './pages/citizen/ComplaintDetail';
import TrackGrievance from './pages/citizen/TrackGrievance';

// Officer Pages
import OfficerDashboard from './pages/officer/OfficerDashboard';
import ComplaintReview from './pages/officer/ComplaintReview';

// Admin Pages
import AdminPanel from './pages/admin/AdminPanel';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageDepartments from './pages/admin/ManageDepartments';

// Shared Profile
import UserProfile from './pages/common/UserProfile';

// Loading Spinner
import LoadingSpinner from './components/common/LoadingSpinner';

// Dynamic resolver for legacy /complaints/:id URLs
function LegacyComplaintRedirect() {
  const { id } = useParams();
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to={`/admin/grievances/${id}`} replace />;
  if (user?.role === 'officer') return <Navigate to={`/officer/grievances/${id}`} replace />;
  return <Navigate to={`/citizen/grievances/${id}`} replace />;
}

// Protected Route Guard
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <LoadingSpinner text="Validating session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'officer') return <Navigate to="/officer/dashboard" replace />;
    return <Navigate to="/citizen/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  const getHomeRedirect = () => {
    if (!user) return <Navigate to="/" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'officer') return <Navigate to="/officer/dashboard" replace />;
    return <Navigate to="/citizen/dashboard" replace />;
  };

  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<IndexPage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />

      {/* Auth Pages */}
      <Route
        path="/login"
        element={
          user ? (
            getHomeRedirect()
          ) : (
            <Login />
          )
        }
      />
      <Route
        path="/register"
        element={
          user ? (
            getHomeRedirect()
          ) : (
            <Register />
          )
        }
      />

      {/* Citizen Protected Routes */}
      <Route
        path="/citizen/dashboard"
        element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <CitizenDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/citizen/submit"
        element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <SubmitComplaint />
          </ProtectedRoute>
        }
      />
      <Route
        path="/citizen/grievances"
        element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <MyComplaints />
          </ProtectedRoute>
        }
      />
      <Route
        path="/citizen/grievances/:id"
        element={
          <ProtectedRoute allowedRoles={['citizen', 'officer', 'admin']}>
            <ComplaintDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/citizen/track"
        element={
          <ProtectedRoute allowedRoles={['citizen', 'officer', 'admin']}>
            <TrackGrievance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/citizen/profile"
        element={
          <ProtectedRoute allowedRoles={['citizen']}>
            <UserProfile />
          </ProtectedRoute>
        }
      />

      {/* Backward Compatibility Alias for citizen */}
      <Route path="/complaints" element={<Navigate to="/citizen/grievances" replace />} />
      <Route path="/submit-complaint" element={<Navigate to="/citizen/submit" replace />} />
      <Route path="/complaints/:id" element={<LegacyComplaintRedirect />} />

      {/* Admin Protected Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/grievances"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/grievances/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ComplaintDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AnalyticsDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ManageUsers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/departments"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ManageDepartments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ManageDepartments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <UserProfile />
          </ProtectedRoute>
        }
      />

      {/* Officer Protected Routes */}
      <Route
        path="/officer/dashboard"
        element={
          <ProtectedRoute allowedRoles={['officer']}>
            <OfficerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/assigned"
        element={
          <ProtectedRoute allowedRoles={['officer']}>
            <OfficerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/grievances/:id"
        element={
          <ProtectedRoute allowedRoles={['officer', 'admin']}>
            <ComplaintReview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/history"
        element={
          <ProtectedRoute allowedRoles={['officer']}>
            <OfficerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/officer/profile"
        element={
          <ProtectedRoute allowedRoles={['officer']}>
            <UserProfile />
          </ProtectedRoute>
        }
      />

      {/* Generic Profile Route for any authenticated user */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['citizen', 'officer', 'admin']}>
            <UserProfile />
          </ProtectedRoute>
        }
      />

      {/* Role-aware Catch-all fallback */}
      <Route
        path="*"
        element={
          user ? (
            user.role === 'admin' ? (
              <Navigate to="/admin/dashboard" replace />
            ) : user.role === 'officer' ? (
              <Navigate to="/officer/dashboard" replace />
            ) : (
              <Navigate to="/citizen/dashboard" replace />
            )
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
