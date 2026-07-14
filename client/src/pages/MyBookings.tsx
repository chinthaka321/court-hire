import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser, SignInButton } from '@clerk/clerk-react';
import { getMyBookings, cancelBooking, apiErrorMessage } from '../lib/api';
import { BookingCard } from '../components/BookingCard';
import type { Booking } from '../types';

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
    onError: (e: unknown) => {
      setCancelError(apiErrorMessage(e, 'Failed to cancel booking'));
    },
  });

  if (!isLoaded) return null;

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 pt-24 text-center">
        <h1 className="text-xl font-bold text-on-surface">Sign in to view your bookings</h1>
        <p className="text-sm text-on-surface-muted mt-2 mb-6">Your upcoming and past bookings live here.</p>
        <SignInButton mode="modal">
          <button className="bg-primary text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-primary-dark transition-colors">
            Sign In
          </button>
        </SignInButton>
      </div>
    );
  }

  const upcoming = bookings.filter(b =>
    b.state === 'Completed' && new Date(b.slotStarts[0]) > new Date()
  );
  const past = bookings.filter(b =>
    b.state !== 'Completed' || new Date(b.slotStarts[0]) <= new Date()
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">My Bookings</h1>
        <p className="text-sm text-on-surface-muted mt-0.5">Your upcoming and past court bookings</p>
      </div>

      {cancelError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {cancelError}
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-sm text-on-surface-muted py-16">Loading…</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-surface-high">
          <p className="text-on-surface font-medium">No bookings yet</p>
          <p className="text-sm text-on-surface-muted mt-1">Book a court to get started</p>
          <button
            onClick={() => navigate('/')}
            className="mt-5 bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors"
          >
            Book a Court
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-muted mb-3">
                Upcoming ({upcoming.length})
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
              <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-muted mb-3">
                Past ({past.length})
              </p>
              <div className="flex flex-col gap-3">
                {past.map(b => <BookingCard key={b.id} booking={b} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
