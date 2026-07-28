import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { getCourts, getAvailability, getMyBookings, rescheduleBooking, apiErrorMessage } from '../lib/api';
import { DatePicker } from '../components/DatePicker';
import { SlotCell } from '../components/SlotCell';
import { WeekView } from '../components/WeekView';
import { useToast } from '../components/ui/ToastContext';
import type { Booking, Court, SlotInfo, SlotStatus } from '../types';
import { toDateOnlyString, formatPrice, formatDateTime } from '../lib/utils';
import { courtNow } from '../lib/courtTime';
import { format, isSameDay } from 'date-fns';
import { Calendar as CalendarIcon, Grid3X3, Sun } from 'lucide-react';

const DURATIONS = [60, 90, 120] as const;
type Duration = (typeof DURATIONS)[number];
type ViewMode = 'day' | 'week';

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
      if (s.status !== 'Available') {
        status = s.status;
        break;
      }
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
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const { showToast } = useToast();

  const [searchParams] = useSearchParams();
  const rescheduleId = searchParams.get('reschedule');

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ['courts'],
    queryFn: getCourts,
  });

  const { data: myBookings = [] } = useQuery<Booking[]>({
    queryKey: ['my-bookings'],
    queryFn: getMyBookings,
    enabled: !!rescheduleId && !!isSignedIn,
  });
  const rescheduling = rescheduleId
    ? myBookings.find((b) => b.id === rescheduleId) ?? null
    : null;

  const activeCourt = rescheduling?.court.id ?? selectedCourtId ?? courts[0]?.id ?? null;
  const activeCourtObj = courts.find((c) => c.id === activeCourt);
  const activeDuration = rescheduling
    ? rescheduling.slotStarts.length * (activeCourtObj?.slotLengthMinutes ?? 30)
    : duration;

  const { data: rawSlots = [], isLoading } = useQuery<SlotInfo[]>({
    queryKey: ['availability', activeCourt, toDateOnlyString(selectedDate)],
    queryFn: () => getAvailability(activeCourt!, toDateOnlyString(selectedDate)),
    enabled: !!activeCourt && viewMode === 'day',
    refetchInterval: 5_000,
  });

  const rescheduleMutation = useMutation({
    mutationFn: (newSlotStart: string) => rescheduleBooking(rescheduleId!, newSlotStart),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      showToast('Booking successfully rescheduled!', 'success');
      navigate('/my-bookings');
    },
    onError: (e: unknown) => {
      const msg = apiErrorMessage(e, 'Could not reschedule to that time.');
      setRescheduleError(msg);
      showToast(msg, 'error');
    },
  });

  const slots = groupSlots(rawSlots, activeDuration);
  const now = courtNow();
  const visibleSlots = slots.filter((s) => s.status === 'Available');

  function handleSlotTap(slot: DisplaySlot) {
    if (!isSignedIn) {
      showToast('Please sign in to book a court slot', 'info');
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
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Hero header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white border-b border-emerald-800/30 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3 backdrop-blur-sm border border-emerald-500/30">
                <Sun className="w-3.5 h-3.5" /> Premium Tennis Courts
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {rescheduling ? 'Reschedule Booking' : 'Book Your Court'}
              </h1>
              <p className="text-sm sm:text-base text-emerald-100/80 mt-2 font-medium max-w-xl">
                {rescheduling
                  ? 'Select a new time slot for your active booking.'
                  : 'Real-time slot availability. Pick a day, choose your session duration, and reserve instantly.'}
              </p>
            </div>

            {/* View Mode Toggle Switch */}
            <div className="flex items-center bg-emerald-950/60 p-1.5 rounded-2xl border border-emerald-700/40 backdrop-blur-md self-start md:self-auto">
              <button
                onClick={() => setViewMode('day')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                  viewMode === 'day'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                    : 'text-emerald-200/70 hover:text-white'
                }`}
              >
                <Grid3X3 className="w-4 h-4" /> Day View
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                    : 'text-emerald-200/70 hover:text-white'
                }`}
              >
                <CalendarIcon className="w-4 h-4" /> 7-Day Week View
              </button>
            </div>
          </div>
        </div>

        {/* Date picker strip (visible in Day View) */}
        {viewMode === 'day' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-inner">
              <DatePicker selected={selectedDate} onSelect={setSelectedDate} />
            </div>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Reschedule banner */}
        {rescheduling && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4 mb-6 text-sm text-amber-900 backdrop-blur-sm shadow-sm">
            <p className="font-bold text-amber-950">
              Moving your {rescheduling.court.name} booking
            </p>
            <p className="text-amber-800 mt-1">
              Current time: <span className="font-semibold text-amber-950">{formatDateTime(rescheduling.slotStarts[0])}</span> ({activeDuration} min).
            </p>
            <p className="text-xs text-amber-800/80 mt-2">
              Note: The new time slot must match the original price of <span className="font-bold text-amber-950">{formatPrice(rescheduling.amountCharged)}</span>. Otherwise, please cancel and book a new slot.{' '}
              <button onClick={() => navigate('/my-bookings')} className="text-emerald-700 hover:text-emerald-900 font-bold underline ml-1 cursor-pointer">
                Keep current time
              </button>
            </p>
          </div>
        )}

        {rescheduleError && (
          <div className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-700 font-semibold shadow-sm">
            {rescheduleError}
          </div>
        )}

        {/* Controls row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Court Selector Tabs */}
          {courts.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {courts.map((court) => (
                <button
                  key={court.id}
                  disabled={!!rescheduling}
                  onClick={() => setSelectedCourtId(court.id)}
                  className={`shrink-0 text-xs sm:text-sm font-extrabold px-5 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    activeCourt === court.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 scale-102'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-slate-900'
                  } ${rescheduling ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {court.name}
                </button>
              ))}
            </div>
          )}

          {/* Session Duration Selector */}
          {!rescheduling && (
            <div className="flex items-center gap-1.5 self-start md:self-auto bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">Duration:</span>
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all duration-200 cursor-pointer ${
                    duration === d
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View render: 7-Day Week View or Day View */}
        {viewMode === 'week' ? (
          <WeekView
            startDate={selectedDate}
            activeCourt={activeCourt!}
            durationMinutes={activeDuration}
            rescheduling={!!rescheduling}
            targetPrice={rescheduling?.amountCharged}
            onSlotSelect={(slot) => handleSlotTap(slot)}
          />
        ) : (
          <>
            {/* Selected date + availability summary */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{dateLabel}</h2>
                {activeCourtObj && (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                    {activeCourtObj.name}
                  </span>
                )}
              </div>
              {!isLoading && slots.length > 0 && (
                <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full border ${
                  visibleSlots.length > 0
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-slate-500 bg-slate-100 border-slate-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${visibleSlots.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                  {visibleSlots.length > 0 ? `${visibleSlots.length} Slots Open` : 'Fully Booked'}
                </span>
              )}
            </div>

            {/* Slot list container */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/40">
              {isLoading || rescheduleMutation.isPending ? (
                <div className="divide-y divide-slate-100">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-6 py-5 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                        <div className="h-5 w-32 bg-slate-200 rounded" />
                      </div>
                      <div className="h-9 w-28 bg-slate-200 rounded-xl" />
                    </div>
                  ))}
                </div>
              ) : visibleSlots.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <Grid3X3 className="w-8 h-8" />
                  </div>
                  <p className="text-lg font-bold text-slate-800">No Slots Available</p>
                  <p className="text-sm text-slate-500 mt-1">Try selecting another date or court tab.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {visibleSlots.map((slot) => (
                    <SlotCell
                      key={slot.slotStart}
                      slot={slot}
                      priceMismatch={!!rescheduling && slot.status === 'Available' && slot.price !== rescheduling.amountCharged}
                      onClick={() => handleSlotTap(slot)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
