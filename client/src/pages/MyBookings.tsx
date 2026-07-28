import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser, SignInButton } from '@clerk/clerk-react';
import { getMyBookings, cancelBooking, getConfig, apiErrorMessage } from '../lib/api';
import { BookingCard } from '../components/BookingCard';
import { Button } from '../components/ui/Button';
import { IconBadge } from '../components/ui/IconBadge';
import { useToast } from '../components/ui/ToastContext';
import { asWallClock, courtNow } from '../lib/courtTime';
import type { Booking } from '../types';
import { CalendarCheck, Lock, AlertCircle } from 'lucide-react';

function isWithinRefundWindow(b: Booking, windowHours: number | undefined) {
  if (windowHours === undefined) return true;
  const cutoff = asWallClock(b.slotStarts[0]).getTime() - windowHours * 3_600_000;
  return courtNow().getTime() <= cutoff;
}

export function MyBookings() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ['my-bookings'],
    queryFn: getMyBookings,
    enabled: !!user,
  });

  const { data: config } = useQuery({ queryKey: ['config'], queryFn: getConfig, staleTime: 300_000 });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelBooking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      setCancelError(null);
      showToast('Booking cancelled successfully!', 'success');
    },
    onError: (e: unknown) => {
      const msg = apiErrorMessage(e, 'Failed to cancel booking');
      setCancelError(msg);
      showToast(msg, 'error');
    },
  });

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <IconBadge icon={Lock} />
        <h1 className="text-2xl font-black text-slate-900">Sign in to View Your Reservations</h1>
        <p className="text-sm font-semibold text-slate-500 max-w-sm mx-auto">
          Access your active court bookings, reschedule sessions, and view your complete reservation history.
        </p>
        <SignInButton mode="modal">
          <Button className="bg-emerald-600 hover:bg-emerald-700 font-extrabold rounded-2xl px-6 py-3 shadow-lg shadow-emerald-600/30">
            Sign In Now
          </Button>
        </SignInButton>
      </div>
    );
  }

  const now = courtNow();
  const upcoming = bookings.filter(
    (b) => b.state === 'Completed' && asWallClock(b.slotStarts[0]) > now
  );
  const past = bookings.filter(
    (b) => b.state !== 'Completed' || asWallClock(b.slotStarts[0]) <= now
  );

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white border-b border-emerald-800/30 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 rounded-2xl backdrop-blur-md border border-emerald-500/30">
              <CalendarCheck className="w-7 h-7 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">My Reservations</h1>
              <p className="text-sm text-emerald-100/80 mt-1 font-semibold">
                Manage your upcoming matches, reschedule sessions, or review booking history.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {cancelError && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-700 font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{cancelError}</span>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-3xl" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-xl space-y-4">
            <IconBadge icon={CalendarCheck} tone="emerald" />
            <h2 className="text-xl font-black text-slate-900">No Reservations Yet</h2>
            <p className="text-sm font-semibold text-slate-400 max-w-sm mx-auto">
              You don&apos;t have any active court bookings. Reserve your slot on the calendar!
            </p>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 font-extrabold rounded-2xl px-6 py-3 shadow-lg shadow-emerald-600/30"
              onClick={() => navigate('/')}
            >
              Book a Court Now
            </Button>
          </div>
        ) : (
          <div className="space-y-10">
            {upcoming.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Upcoming Sessions ({upcoming.length})
                  </h2>
                </div>
                <div className="flex flex-col gap-4">
                  {upcoming.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      onCancel={() => {
                        const message = isWithinRefundWindow(b, config?.cancellationWindowHours)
                          ? 'Cancel this booking? A full refund will be issued to your card.'
                          : `Cancel this booking? The cancellation window (${
                              config?.cancellationWindowHours ?? 24
                            }h before slot) has passed — NO refund will be issued.`;
                        if (window.confirm(message)) {
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
              <section className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Past / Cancelled ({past.length})
                </h2>
                <div className="flex flex-col gap-4">
                  {past.map((b) => (
                    <BookingCard key={b.id} booking={b} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
