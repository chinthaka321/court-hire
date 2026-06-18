import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/clerk-react';
import { getMyBookings, cancelBooking } from '../lib/api';
import { BookingCard } from '../components/BookingCard';
import { Booking } from '../types';

export function MyBookings() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['my-bookings'],
    queryFn: getMyBookings,
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setCancelError(null);
    },
    onError: (e: any) => {
      setCancelError(e.response?.data?.error ?? 'Failed to cancel booking');
    },
  });

  if (!isLoaded) return null;
  if (!user) {
    navigate('/login');
    return null;
  }

  const upcoming = bookings.filter(b =>
    b.state === 'Completed' && new Date(b.slotStarts[0]) > new Date()
  );
  const past = bookings.filter(b =>
    b.state !== 'Completed' || new Date(b.slotStarts[0]) <= new Date()
  );

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-[#191c19] mb-6">My Bookings</h1>

      {cancelError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {cancelError}
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-sm text-[#404942] py-12">Loading…</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#404942] text-sm">No bookings yet.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-[#1b5e3b] text-sm font-medium"
          >
            Book a court →
          </button>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#404942] mb-2">
                Upcoming
              </p>
              <div className="flex flex-col gap-3">
                {upcoming.map(b => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    onCancel={() => {
                      if (window.confirm('Cancel this booking? A full refund will be issued if within the cancellation window.')) {
                        cancelMutation.mutate(b.id);
                      }
                    }}
                    onReschedule={() => navigate(`/?reschedule=${b.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#404942] mb-2">
                Past
              </p>
              <div className="flex flex-col gap-3">
                {past.map(b => <BookingCard key={b.id} booking={b} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
