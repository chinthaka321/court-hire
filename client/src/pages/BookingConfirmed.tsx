import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyBookings } from '../lib/api';
import type { Booking } from '../types';
import { formatDateTime, formatPrice } from '../lib/utils';

export function BookingConfirmed() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ['my-bookings'],
    queryFn: getMyBookings,
  });

  const booking = bookings.find(b => b.id === id);

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12 text-center">
      {/* Success icon */}
      <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-5">
        <svg viewBox="0 0 24 24" fill="none" stroke="#1b5e3b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-on-surface">Booking Confirmed!</h1>
      <p className="text-sm text-on-surface-muted mt-2">A confirmation email has been sent to you.</p>

      {booking && (
        <div className="mt-8 bg-white rounded-2xl border border-surface-high text-left divide-y divide-[#f0f0f0]">
          <Row label="Court"       value={booking.court.name} />
          <Row label="Date & Time" value={formatDateTime(booking.slotStarts[0])} />
          <Row label="Amount Paid" value={formatPrice(booking.amountCharged)} />
          <Row label="Booking ID"  value={booking.id.slice(0, 8).toUpperCase()} />
        </div>
      )}

      <div className="flex flex-col gap-3 mt-8">
        <button
          onClick={() => navigate('/my-bookings')}
          className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-dark transition-colors"
        >
          View My Bookings
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full text-primary font-medium py-3 rounded-xl border border-primary hover:bg-primary-light transition-colors"
        >
          Book Another Court
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm text-on-surface-muted">{label}</span>
      <span className="text-sm font-semibold text-on-surface">{value}</span>
    </div>
  );
}
