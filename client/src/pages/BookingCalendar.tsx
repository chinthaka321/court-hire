import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { getCourts, getAvailability, getMyBookings, rescheduleBooking, apiErrorMessage } from '../lib/api';
import { DatePicker } from '../components/DatePicker';
import { SlotCell } from '../components/SlotCell';
import type { Booking, Court, SlotInfo, SlotStatus } from '../types';
import { toDateOnlyString, formatPrice, formatDateTime } from '../lib/utils';
import { isToday, format } from 'date-fns';

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
  const [selectedDate, setSelectedDate] = useState(new Date());
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
  const availableSlots = slots.filter(s => s.status === 'Available');

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

  const dateLabel = isToday(selectedDate)
    ? 'Today'
    : format(selectedDate, 'EEE, MMM d');

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero header */}
      <div className="bg-white border-b border-surface-high">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">
            {rescheduling ? 'Reschedule Booking' : 'Book a Court'}
          </h1>
          <p className="text-sm text-on-surface-muted mt-1">
            {rescheduling
              ? 'Pick a new start time for your booking.'
              : 'Pick a date, choose a court, tap a slot.'}
          </p>
        </div>

        {/* Date picker strip */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-5">
          <DatePicker selected={selectedDate} onSelect={setSelectedDate} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
        {/* Reschedule banner */}
        {rescheduling && (
          <div className="bg-primary-light border border-primary/20 rounded-xl px-4 py-3 mb-5 text-sm text-on-surface">
            <p>
              Moving your <span className="font-semibold">{rescheduling.court.name}</span> booking
              on {formatDateTime(rescheduling.slotStarts[0])} ({activeDuration} min).
            </p>
            <p className="text-xs text-on-surface-muted mt-1">
              The new time must cost the same ({formatPrice(rescheduling.amountCharged)}) — otherwise cancel and rebook.{' '}
              <button onClick={() => navigate('/my-bookings')} className="text-primary font-medium underline">
                Keep current time
              </button>
            </p>
          </div>
        )}

        {rescheduleError && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {rescheduleError}
          </div>
        )}

        {/* Court tabs — hidden while rescheduling (same-court swap only) */}
        {!rescheduling && courts.length > 1 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {courts.map(court => (
              <button
                key={court.id}
                onClick={() => setSelectedCourtId(court.id)}
                className={`shrink-0 text-sm font-semibold px-4 py-2 rounded-full border transition-all ${
                  activeCourt === court.id
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-on-surface-muted border-surface-high hover:border-primary hover:text-on-surface'
                }`}
              >
                {court.name}
              </button>
            ))}
          </div>
        )}

        {/* Duration selector — fixed while rescheduling */}
        {!rescheduling && (
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs font-medium text-on-surface-muted mr-1">Duration</span>
            {DURATIONS.map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  duration === d
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white text-on-surface-muted border-surface-high hover:border-primary hover:text-on-surface'
                }`}
              >
                {d} min
              </button>
            ))}
          </div>
        )}

        {/* Selected date + availability summary */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-on-surface">{dateLabel}</h2>
            {activeCourtObj && (rescheduling || courts.length === 1) && (
              <span className="text-sm text-on-surface-muted">· {activeCourtObj.name}</span>
            )}
          </div>
          {!isLoading && slots.length > 0 && (
            <span className={`text-sm font-semibold ${
              availableSlots.length > 0 ? 'text-primary' : 'text-[#9aab9a]'
            }`}>
              {availableSlots.length > 0 ? `${availableSlots.length} open` : 'Fully booked'}
            </span>
          )}
        </div>

        {/* Court info strip */}
        {activeCourtObj && (
          <div className="flex items-center gap-4 mb-4 text-xs text-on-surface-muted">
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-primary">
                <path d="M8 3.5a.5.5 0 00-1 0V9a.5.5 0 00.252.434l3.5 2a.5.5 0 00.496-.868L8 8.71V3.5z"/>
                <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm7-8A7 7 0 111 8a7 7 0 0114 0z"/>
              </svg>
              {activeCourtObj.openingHours.open.slice(0, 5)} – {activeCourtObj.openingHours.close.slice(0, 5)}
            </span>
            <span className="text-outline-variant">·</span>
            <span>{activeDuration} min session</span>
          </div>
        )}

        {/* Slot list */}
        <div className="bg-white rounded-2xl border border-surface-high overflow-hidden shadow-sm">
          {isLoading || rescheduleMutation.isPending ? (
            <div className="divide-y divide-[#f0f0f0]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-200" />
                    <div className="h-5 w-28 bg-gray-100 rounded" />
                  </div>
                  <div className="h-7 w-20 bg-gray-100 rounded-lg" />
                </div>
              ))}
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-base font-medium text-on-surface-muted">No slots available</p>
              <p className="text-sm text-[#9aab9a] mt-1">Try a different date{rescheduling ? '' : ' or court'}</p>
            </div>
          ) : (
            <div>
              {availableSlots.map(slot => (
                <SlotCell
                  key={slot.slotStart}
                  slot={slot}
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
