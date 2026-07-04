import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import { useUIStore } from './store/ui';
import { supabase } from './lib/supabase';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Layout
import { DashboardLayout } from './components/layout/DashboardLayout';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { BedManagement } from './pages/admin/BedManagement';
import { OTManagement } from './pages/admin/OTManagement';
import { DoctorsManagement } from './pages/admin/DoctorsManagement';
import { PatientsManagement } from './pages/admin/PatientsManagement';
import { DepartmentsManagement } from './pages/admin/DepartmentsManagement';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { AdminCopilot } from './pages/admin/AdminCopilot';
import { ClaimsManagement } from './pages/admin/ClaimsManagement';
import { AdminSettings } from './pages/admin/AdminSettings';

// Shared Pages
import { AppointmentsPage } from './pages/shared/AppointmentsPage';
import { VideoSessionsPage, VideoCallRoom } from './pages/shared/VideoSessions';

// Patient Pages
import { PatientDashboard } from './pages/patient/PatientDashboard';
import { BookAppointment } from './pages/patient/BookAppointment';
import { MedicalReports } from './pages/patient/MedicalReports';
import { Prescriptions } from './pages/patient/Prescriptions';
import { AIHealthAssistant } from './pages/patient/AIHealthAssistant';

// Doctor Pages
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorPatients } from './pages/doctor/DoctorPatients';
import { DoctorReports } from './pages/doctor/DoctorReports';
import { ClinicalCoding } from './pages/doctor/ClinicalCoding';
import { DoctorSchedule } from './pages/doctor/DoctorSchedule';

// Components
import { CommandPalette } from './components/CommandPalette';
import { AIAssistant, AIAssistantFAB } from './components/ai/AIAssistant';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { user, loading, session, fetchProfile } = useAuthStore();
  const location = useLocation();
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    if (session?.user && !user && !profileChecked) {
      fetchProfile(session.user.id).finally(() => setProfileChecked(true));
    } else if (!session) {
      setProfileChecked(true);
    }
  }, [session, user, profileChecked]);

  if (loading || (session?.user && !user && !profileChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <>{children}</>;
}

function App() {
  const { user, setUser, setSession, setLoading, fetchProfile } = useAuthStore();
  const { setAIAssistant } = useUIStore();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setSession(session);
        if (event === 'SIGNED_OUT') {
          setUser(null);
          navigate('/login');
        } else if (event === 'SIGNED_IN' && session?.user) {
          await fetchProfile(session.user.id);
        }
      })();
    });

    // Listen for AI assistant open event from command palette
    const handler = () => setAIAssistant(true);
    window.addEventListener('open-ai-assistant', handler);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('open-ai-assistant', handler);
    };
  }, []);

  return (
    <>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={user ? <Navigate to={`/${user.role}`} /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to={`/${user.role}`} /> : <RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="appointments" element={<AppointmentsPage role="admin" />} />
          <Route path="beds" element={<BedManagement />} />
          <Route path="operation-theatres" element={<OTManagement />} />
          <Route path="doctors" element={<DoctorsManagement />} />
          <Route path="patients" element={<PatientsManagement />} />
          <Route path="departments" element={<DepartmentsManagement />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="claims" element={<ClaimsManagement />} />
          <Route path="copilot" element={<AdminCopilot />} />
          <Route path="video-sessions" element={<VideoSessionsPage role="admin" />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Doctor Routes */}
        <Route path="/doctor" element={<ProtectedRoute roles={['doctor']}><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DoctorDashboard />} />
          <Route path="appointments" element={<AppointmentsPage role="doctor" />} />
          <Route path="patients" element={<DoctorPatients />} />
          <Route path="video-sessions" element={<VideoSessionsPage role="doctor" />} />
          <Route path="reports" element={<DoctorReports />} />
          <Route path="coding" element={<ClinicalCoding />} />
          <Route path="schedule" element={<DoctorSchedule />} />
        </Route>

        {/* Patient Routes */}
        <Route path="/patient" element={<ProtectedRoute roles={['patient']}><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<PatientDashboard />} />
          <Route path="appointments" element={<AppointmentsPage role="patient" />} />
          <Route path="book" element={<BookAppointment />} />
          <Route path="video-sessions" element={<VideoSessionsPage role="patient" />} />
          <Route path="reports" element={<MedicalReports />} />
          <Route path="prescriptions" element={<Prescriptions />} />
          <Route path="ai-assistant" element={<AIHealthAssistant />} />
        </Route>

        {/* Video Call Routes */}
        <Route path="/doctor/video-call/:id" element={<ProtectedRoute roles={['doctor']}><VideoCallRouteWrapper role="doctor" /></ProtectedRoute>} />
        <Route path="/patient/video-call/:id" element={<ProtectedRoute roles={['patient']}><VideoCallRouteWrapper role="patient" /></ProtectedRoute>} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to={user ? `/${user.role}` : '/login'} />} />
        <Route path="*" element={<Navigate to={user ? `/${user.role}` : '/login'} />} />
      </Routes>

      {/* Global Components */}
      {user && (
        <>
          <CommandPalette />
          {user.role !== 'doctor' && <AIAssistant />}
          {user.role !== 'doctor' && <AIAssistantFAB />}
        </>
      )}
    </>
  );
}

function VideoCallRouteWrapper({ role }: { role: 'doctor' | 'patient' }) {
  const { id } = useParams();
  return <VideoCallRoom role={role} appointmentId={id || ''} />;
}

export default App;
