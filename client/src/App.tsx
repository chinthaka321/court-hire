import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useEffect, lazy, Suspense } from 'react';
import { setAuthToken, getMe, getConfig } from './lib/api';
import { setCourtTimeZone } from './lib/courtTime';
import { Navbar } from './components/Navbar';
import { AdminRoute } from './components/AdminRoute';
import { AdminLayout } from './components/AdminLayout';
import { BookingCalendar } from './pages/BookingCalendar';
import { BookingConfirmation } from './pages/BookingConfirmation';
import { BookingConfirming } from './pages/BookingConfirming';
import { BookingConfirmed } from './pages/BookingConfirmed';
import { MyBookings } from './pages/MyBookings';
import { NotFound } from './pages/NotFound';
import { ToastProvider } from './components/ui/ToastContext';

// Lazy load admin pages for optimal bundle splitting
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminCourts = lazy(() => import('./pages/admin/AdminCourts').then(m => ({ default: m.AdminCourts })));
const AdminPricing = lazy(() => import('./pages/admin/AdminPricing').then(m => ({ default: m.AdminPricing })));
const AdminBlackouts = lazy(() => import('./pages/admin/AdminBlackouts').then(m => ({ default: m.AdminBlackouts })));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings').then(m => ({ default: m.AdminBookings })));

function TokenSyncer() {
  const { getToken } = useAuth();
  useEffect(() => {
    const refresh = async () => {
      const token = await getToken();
      setAuthToken(token);
      if (token) {
        try {
          await getMe();
        } catch (e) {
          console.error('Failed to sync user with server:', e);
        }
      }
    };
    refresh();
    const id = setInterval(refresh, 55_000);
    return () => clearInterval(id);
  }, [getToken]);
  return null;
}

function ConfigSyncer() {
  useEffect(() => {
    getConfig().then(cfg => setCourtTimeZone(cfg.timeZoneId)).catch(() => {});
  }, []);
  return null;
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppShell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  return (
    <ToastProvider>
      <TokenSyncer />
      <ConfigSyncer />
      {!isAdmin && <Navbar />}
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<BookingCalendar />} />
          <Route path="/book/:courtId/:slotStart" element={<BookingConfirmation />} />
          <Route path="/booking/confirming" element={<BookingConfirming />} />
          <Route path="/booking/confirmed/:id" element={<BookingConfirmed />} />
          <Route path="/my-bookings" element={<MyBookings />} />

          <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/courts" element={<AdminCourts />} />
            <Route path="/admin/pricing" element={<AdminPricing />} />
            <Route path="/admin/blackouts" element={<AdminBlackouts />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ToastProvider>
  );
}

export default function App() {
  return <AppShell />;
}
