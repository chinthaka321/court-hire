import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { getCourts, getAvailability, getMyBookings, rescheduleBooking, apiErrorMessage } from '../lib/api';
import { DatePicker } from '../components/DatePicker';
import { SlotCell } from '../components/SlotCell';
import type { Booking, Court, SlotInfo, SlotStatus } from '../types';
import { toDateOnlyString, formatPrice, formatDateTime } from '../lib/utils';
import { courtNow } from '../lib/courtTime';
import { format, isSameDay } from 'date-fns';

const DURATIONS = [60, 90, 120] as const;
type Duration = (typeof DURATIONS)[number];

interface DisplaySlot extends SlotInfo {
  slotCount: number;
}

function baseSlotLen(slots: SlotInfo[]): number {
  if (slots.length === 0) return 30;
  return Math.round(
    (new Date(slots[0].slotEnd).getTime() - new Date(slots[0].slotStart).getTime()) / 60000
  );
}

function groupSlots(slots: SlotInfo[], durationMinutes: number): DisplaySlot[] {
  const base = baseSlotLen(slots);
  const n = Math.max(1, Math.round(durationMinutes / base));
  const result: DisplaySlot[] = [];

  for (let i = 0; i + n <= slots.length; i++) {
    const group = slots.slice(i, i + n);
    const first = group[0];
    const last = group[n - 1];

    let status: SlotStatus = 'Available';
    for (const s of group) {
      if (s.status !== 'Available') { status = s.status; break; }
    }

    result.push({
      slotStart: first.slotStart,
      slotEnd: last.slotEnd,
      status,
      price: status === 'Available' ? group.reduce((sum, s) => sum + s.price, 0) : 0,
      slotCount: n,
    });
  }

  return result;
}

export function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState(() => courtNow());
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [duration, setDuration] = useState<Duration>(60);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();

  const [searchParams] = useSearchParams();
  const rescheduleId = searchParams.get('reschedule');

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ['courts'],
    queryFn: getCourts,
  });

  // Reschedule mode: the booking being moved locks the court and duration
  // (same court, same slot count, same total price — see ADR-0004).
  const { data: myBookings = [] } = useQuery<Booking[]>({
    queryKey: ['my-bookings'],
    queryFn: getMyBookings,
    enabled: !!rescheduleId && !!isSignedIn,
  });
  const rescheduling = rescheduleId
    ? myBookings.find(b => b.id === rescheduleId) ?? null
    : null;

  const activeCourt = rescheduling?.court.id ?? selectedCourtId ?? courts[0]?.id ?? null;
  const activeCourtObj = courts.find(c => c.id === activeCourt);
  const activeDuration = rescheduling
    ? rescheduling.slotStarts.length * (activeCourtObj?.slotLengthMinutes ?? 30)
    : duration;

  const { data: rawSlots = [], isLoading } = useQuery<SlotInfo[]>({
    queryKey: ['availability', activeCourt, toDateOnlyString(selectedDate)],
    queryFn: () => getAvailability(activeCourt!, toDateOnlyString(selectedDate)),
    enabled: !!activeCourt,
    // Faster than the 15s default (main.tsx) — this is the double-booking-race-sensitive
    // view, see ADR-0011.
    refetchInterval: 5_000,
  });

  const rescheduleMutation = useMutation({
    mutationFn: (newSlotStart: string) => rescheduleBooking(rescheduleId!, newSlotStart),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      navigate('/my-bookings');
    },
    onError: (e: unknown) => {
      setRescheduleError(apiErrorMessage(e, 'Could not reschedule to that time.'));
    },
  });

  const slots = groupSlots(rawSlots, activeDuration);
  const now = courtNow();
  // The server already classifies past slots as status 'Past' (using the same
  // court-local clock), so filtering on 'Available' alone hides them too.
  const visibleSlots = slots.filter(s => s.status === 'Available');
  function handleSlotTap(slot: DisplaySlot) {
    if (!isSignedIn) {
      openSignIn();
      return;
    }
    if (rescheduling) {
      setRescheduleError(null);
      rescheduleMutation.mutate(slot.slotStart);
      return;
    }
    navigate(
      `/book/${activeCourt}/${encodeURIComponent(slot.slotStart)}?slotCount=${slot.slotCount}&price=${slot.price}`
    );
  }

  const dateLabel = isSameDay(selectedDate, now)
    ? 'Today'
    : format(selectedDate, 'EEE, MMM d');

  return (
    <div className="min-h-screen bg-surface pb-12">
      {/* Hero header */}
      <div className="bg-gradient-to-r from-emerald-50/60 via-teal-50/20 to-white border-b border-gray-100/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight">
            {rescheduling ? 'Reschedule Booking' : 'Book a Court'}
          </h1>
          <p className="text-sm sm:text-base text-on-surface-muted mt-2 font-medium">
            {rescheduling
              ? 'Select a new start time for your court booking below.'
              : 'Secure your slot in seconds. Pick a date, choose a court, and tap a time slot.'}
          </p>
        </div>

        {/* Date picker strip */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-6">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm shadow-emerald-950/[0.02]">
            <DatePicker selected={selectedDate} onSelect={setSelectedDate} />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Reschedule banner */}
        {rescheduling && (
          <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl px-5 py-4 mb-6 text-sm text-on-surface">
            <p className="font-semibold text-amber-900">
              Moving your {rescheduling.court.name} booking
            </p>
            <p className="text-on-surface-muted mt-1">
              Current time: <span className="font-medium text-on-surface">{formatDateTime(rescheduling.slotStarts[0])}</span> ({activeDuration} min).
            </p>
            <p className="text-xs text-on-surface-muted mt-2">
              Note: The new time slot must match the original price of <span className="font-bold text-on-surface">{formatPrice(rescheduling.amountCharged)}</span>. Otherwise, please cancel and book a new slot.{' '}
              <button onClick={() => navigate('/my-bookings')} className="text-primary hover:text-primary-dark font-semibold underline ml-1 cursor-pointer">
                Keep current time
              </button>
            </p>
          </div>
        )}

        {rescheduleError && (
          <div className="mb-6 bg-red-50/80 border border-red-200/50 rounded-2xl p-4 text-sm text-red-700 font-medium">
            {rescheduleError}
          </div>
        )}

        {/* Court tabs & Duration selectors flex row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          {/* Court tabs — hidden while rescheduling (same-court swap only) */}
          {!rescheduling && courts.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {courts.map(court => (
                <button
                  key={court.id}
                  onClick={() => setSelectedCourtId(court.id)}
                  className={`shrink-0 text-sm font-semibold px-4.5 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    activeCourt === court.id
                      ? 'bg-primary text-white border-primary shadow-md shadow-primary/10'
                      : 'bg-white text-on-surface-muted border-gray-200/70 hover:border-primary/40 hover:text-on-surface'
                  }`}
                >
                  {court.name}
                </button>
              ))}
            </div>
          )}

          {/* Duration selector — fixed while rescheduling */}
          {!rescheduling && (
            <div className="flex items-center gap-2 self-start sm:self-auto bg-gray-100/70 p-1 rounded-xl border border-gray-200/30">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                    duration === d
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-on-surface-muted hover:text-on-surface'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected date + availability summary */}
        <div className="flex items-center justify-between mb-4.5 px-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-on-surface tracking-tight">{dateLabel}</h2>
            {activeCourtObj && (rescheduling || courts.length === 1) && (
              <span className="text-sm font-semibold text-on-surface-muted bg-gray-100 px-3 py-1 rounded-lg">
                {activeCourtObj.name}
              </span>
            )}
          </div>
          {!isLoading && slots.length > 0 && (
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
              visibleSlots.length > 0
                ? 'text-emerald-700 bg-emerald-50/50 border-emerald-100'
                : 'text-gray-400 bg-gray-50 border-gray-100'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${visibleSlots.length > 0 ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              {visibleSlots.length > 0 ? `${visibleSlots.length} Slots Open` : 'Fully Booked'}
            </span>
          )}
        </div>

        {/* Court info strip */}
        {activeCourtObj && (
          <div className="flex items-center gap-4 mb-5 px-1 text-xs font-medium text-on-surface-muted">
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-primary">
                <path d="M8 3.5a.5.5 0 00-1 0V9a.5.5 0 00.252.434l3.5 2a.5.5 0 00.496-.868L8 8.71V3.5z"/>
                <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm7-8A7 7 0 111 8a7 7 0 0114 0z"/>
              </svg>
              Operating Hours: {activeCourtObj.openingHours.open.slice(0, 5)} – {activeCourtObj.openingHours.close.slice(0, 5)}
            </span>
            <span className="text-gray-300">•</span>
            <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]">
              {activeDuration} Min Session
            </span>
          </div>
        )}

        {/* Slot list */}
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm shadow-gray-200/50">
          {isLoading || rescheduleMutation.isPending ? (
            <div className="divide-y divide-gray-100">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-6 py-5 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-200" />
                    <div className="h-5 w-28 bg-gray-100 rounded" />
                  </div>
                  <div className="h-8 w-24 bg-gray-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : visibleSlots.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" className="w-8 h-8">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p className="text-lg font-bold text-on-surface">No Slots Available</p>
              <p className="text-sm text-on-surface-muted mt-1">Try selecting another date{rescheduling ? '' : ' or court'}.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visibleSlots.map(slot => (
                <SlotCell
                  key={slot.slotStart}
                  slot={slot}
                  // Same-price swap only (ADR-0004): grey out targets that can
                  // never succeed instead of failing after the tap (#29)
                  priceMismatch={!!rescheduling && slot.status === 'Available' && slot.price !== rescheduling.amountCharged}
                  onClick={() => handleSlotTap(slot)}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
