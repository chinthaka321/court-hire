import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { getCourts, getAvailability } from '../lib/api';
import { DatePicker } from '../components/DatePicker';
import { SlotCell } from '../components/SlotCell';
import type { Court, SlotInfo, SlotStatus } from '../types';
import { toDateOnlyString } from '../lib/utils';
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

function groupSlots(slots: SlotInfo[], durationMinutes: Duration): DisplaySlot[] {
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
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ['courts'],
    queryFn: getCourts,
  });

  const activeCourt = selectedCourtId ?? courts[0]?.id ?? null;
  const activeCourtObj = courts.find(c => c.id === activeCourt);

  const { data: rawSlots = [], isLoading } = useQuery<SlotInfo[]>({
    queryKey: ['availability', activeCourt, toDateOnlyString(selectedDate)],
    queryFn: () => getAvailability(activeCourt!, toDateOnlyString(selectedDate)),
    enabled: !!activeCourt,
  });

  const slots = groupSlots(rawSlots, duration);
  const availableCount = slots.filter(s => s.status === 'Available').length;

  function handleSlotTap(slot: DisplaySlot) {
    if (!isSignedIn) {
      navigate('/login');
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
    <div className="min-h-screen bg-[#f8faf5]">
      {/* Hero header */}
      <div className="bg-white border-b border-[#e6e9e4]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#191c19]">Book a Court</h1>
          <p className="text-sm text-[#404942] mt-1">
            Pick a date, choose a court, tap a slot.
          </p>
        </div>

        {/* Date picker strip */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-5">
          <DatePicker selected={selectedDate} onSelect={setSelectedDate} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
        {/* Court tabs */}
        {courts.length > 1 && (
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {courts.map(court => (
              <button
                key={court.id}
                onClick={() => setSelectedCourtId(court.id)}
                className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-full border transition-all ${
                  activeCourt === court.id
                    ? 'bg-[#1b5e3b] text-white border-[#1b5e3b] shadow-sm'
                    : 'bg-white text-[#404942] border-[#e6e9e4] hover:border-[#1b5e3b] hover:text-[#191c19]'
                }`}
              >
                {court.name}
              </button>
            ))}
          </div>
        )}

        {/* Duration selector */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs font-medium text-[#404942] mr-1">Duration</span>
          {DURATIONS.map(d => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                duration === d
                  ? 'bg-[#1b5e3b] text-white border-[#1b5e3b] shadow-sm'
                  : 'bg-white text-[#404942] border-[#e6e9e4] hover:border-[#1b5e3b] hover:text-[#191c19]'
              }`}
            >
              {d} min
            </button>
          ))}
        </div>

        {/* Selected date + availability summary */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-[#191c19]">{dateLabel}</h2>
            {activeCourtObj && courts.length === 1 && (
              <span className="text-sm text-[#404942]">· {activeCourtObj.name}</span>
            )}
          </div>
          {!isLoading && slots.length > 0 && (
            <span className={`text-sm font-semibold ${
              availableCount > 0 ? 'text-[#1b5e3b]' : 'text-[#9aab9a]'
            }`}>
              {availableCount > 0 ? `${availableCount} open` : 'Fully booked'}
            </span>
          )}
        </div>

        {/* Court info strip */}
        {activeCourtObj && (
          <div className="flex items-center gap-4 mb-4 text-xs text-[#404942]">
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-[#1b5e3b]">
                <path d="M8 3.5a.5.5 0 00-1 0V9a.5.5 0 00.252.434l3.5 2a.5.5 0 00.496-.868L8 8.71V3.5z"/>
                <path d="M8 16A8 8 0 108 0a8 8 0 000 16zm7-8A7 7 0 111 8a7 7 0 0114 0z"/>
              </svg>
              {activeCourtObj.openingHours.open.slice(0, 5)} – {activeCourtObj.openingHours.close.slice(0, 5)}
            </span>
            <span className="text-[#bfc9bf]">·</span>
            <span>{duration} min session</span>
          </div>
        )}

        {/* Slot list */}
        <div className="bg-white rounded-2xl border border-[#e6e9e4] overflow-hidden shadow-sm">
          {isLoading ? (
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
          ) : slots.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-base font-medium text-[#404942]">No slots available</p>
              <p className="text-sm text-[#9aab9a] mt-1">Try a different date or court</p>
            </div>
          ) : (
            <div>
              {slots
                .filter(s => s.status === 'Available')
                .map(slot => (
                  <SlotCell
                    key={slot.slotStart}
                    slot={slot}
                    onClick={() => handleSlotTap(slot)}
                  />
                ))}
              {slots.filter(s => s.status === 'Available').length === 0 && (
                <div className="py-16 text-center">
                  <p className="text-base font-medium text-[#404942]">No slots available</p>
                  <p className="text-sm text-[#9aab9a] mt-1">Try a different date or court</p>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
