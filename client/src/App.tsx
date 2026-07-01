import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { setAuthToken } from './lib/api';
import { Navbar } from './components/Navbar';
import { AdminRoute } from './components/AdminRoute';
import { AdminLayout } from './components/AdminLayout';
import { BookingCalendar } from './pages/BookingCalendar';
import { BookingConfirmation } from './pages/BookingConfirmation';
import { BookingConfirming } from './pages/BookingConfirming';
import { BookingConfirmed } from './pages/BookingConfirmed';
import { MyBookings } from './pages/MyBookings';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminCourts } from './pages/admin/AdminCourts';
import { AdminPricing } from './pages/admin/AdminPricing';
import { AdminBlackouts } from './pages/admin/AdminBlackouts';
import { AdminBookings } from './pages/admin/AdminBookings';

function TokenSyncer() {
  const { getToken } = useAuth();
  useEffect(() => {
    const refresh = async () => setAuthToken(await getToken());
    refresh();
    const id = setInterval(refresh, 55_000);
    return () => clearInterval(id);
  }, [getToken]);
  return null;
}

function AppShell() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  return (
    <>
      <TokenSyncer />
      {!isAdmin && <Navbar />}
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
      </Routes>
    </>
  );
}

export default function App() {
  return <AppShell />;
}
