import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyBookings } from '../lib/api';
import type { Booking } from '../types';
import { formatDateTime, formatPrice } from '../lib/utils';
import { bookingDurationMinutes } from '../lib/booking';
import { Button } from '../components/ui/Button';
import { CheckCircle2 } from 'lucide-react';

export function BookingConfirmed() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['my-bookings'],
    queryFn: getMyBookings,
  });

  const booking = bookings.find((b) => b.id === id);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-16 text-center space-y-8">
      <div className="w-24 h-24 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-emerald-600/30">
        <CheckCircle2 className="w-12 h-12 text-white animate-bounce" />
      </div>

      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Court Reservation Confirmed!</h1>
        <p className="text-sm font-semibold text-slate-500 mt-2">
          Your payment has settled and a confirmation email has been dispatched to your account.
        </p>
      </div>

      {isLoading && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 animate-pulse shadow-xl">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2">
              <div className="h-4 w-20 bg-slate-200 rounded" />
              <div className="h-4 w-32 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {booking && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden divide-y divide-slate-100 text-left">
          <Row label="Court" value={booking.court.name} />
          <Row label="Date & Time" value={formatDateTime(booking.slotStarts[0])} />
          <Row label="Duration" value={`${bookingDurationMinutes(booking)} min`} />
          <Row label="Total Paid" value={formatPrice(booking.amountCharged)} />
          <Row label="Booking Reference" value={`#${booking.id.slice(0, 8).toUpperCase()}`} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 pt-4">
        <Button
          className="flex-1 py-4 text-base font-extrabold bg-emerald-600 hover:bg-emerald-700 rounded-2xl shadow-lg shadow-emerald-600/30"
          onClick={() => navigate('/my-bookings')}
        >
          View My Bookings
        </Button>
        <Button
          variant="outline"
          className="flex-1 py-4 text-base font-extrabold rounded-2xl border-slate-300"
          onClick={() => navigate('/')}
        >
          Book Another Court
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-sm font-black text-slate-900">{value}</span>
    </div>
  );
}
