import { useQueries } from '@tanstack/react-query';
import { addDays, format, isSameDay } from 'date-fns';
import { getAvailability } from '../lib/api';
import type { SlotInfo, SlotStatus } from '../types';
import { toDateOnlyString, formatPrice } from '../lib/utils';
import { courtNow } from '../lib/courtTime';
import { Calendar, Clock } from 'lucide-react';

interface DisplaySlot extends SlotInfo {
  slotCount: number;
}

interface WeekViewProps {
  startDate: Date;
  activeCourt: string;
  durationMinutes: number;
  rescheduling: boolean;
  targetPrice?: number;
  onSlotSelect: (slot: DisplaySlot, date: Date) => void;
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

export function WeekView({
  startDate,
  activeCourt,
  durationMinutes,
  rescheduling,
  targetPrice,
  onSlotSelect,
}: WeekViewProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  const today = courtNow();

  const dayQueries = useQueries({
    queries: weekDays.map((day) => {
      const dateStr = toDateOnlyString(day);
      return {
        queryKey: ['availability', activeCourt, dateStr],
        queryFn: () => getAvailability(activeCourt, dateStr),
        enabled: !!activeCourt,
        refetchInterval: 10_000,
      };
    }),
  });

  const isLoading = dayQueries.some((q) => q.isLoading);

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-emerald-900/10 p-4 sm:p-6 shadow-xl shadow-emerald-950/[0.03]">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-lg">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <span>7-Day Court Overview</span>
        </div>
        <div className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
          {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 animate-pulse">
          {weekDays.map((_, idx) => (
            <div key={idx} className="h-64 bg-gray-100 rounded-2xl p-3 flex flex-col gap-2">
              <div className="h-6 bg-gray-200 rounded-lg w-full" />
              <div className="h-10 bg-gray-200 rounded-xl" />
              <div className="h-10 bg-gray-200 rounded-xl" />
              <div className="h-10 bg-gray-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 overflow-x-auto">
          {weekDays.map((day, index) => {
            const query = dayQueries[index];
            const rawSlots = query.data || [];
            const displaySlots = groupSlots(rawSlots, durationMinutes);
            const openSlots = displaySlots.filter((s) => s.status === 'Available');
            const isToday = isSameDay(day, today);

            return (
              <div
                key={toDateOnlyString(day)}
                className={`flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isToday
                    ? 'border-emerald-500/40 bg-emerald-50/20 shadow-sm'
                    : 'border-gray-100 bg-white hover:border-emerald-200'
                }`}
              >
                {/* Day Header */}
                <div
                  className={`p-3 text-center border-b ${
                    isToday ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-800'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider block opacity-90">
                    {format(day, 'EEE')}
                  </span>
                  <span className="text-base font-black leading-tight block">
                    {format(day, 'MMM d')}
                  </span>
                  <span
                    className={`text-[10px] font-semibold mt-1 inline-block px-2 py-0.5 rounded-full ${
                      isToday
                        ? 'bg-white/20 text-white'
                        : openSlots.length > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {openSlots.length} open
                  </span>
                </div>

                {/* Slots Column */}
                <div className="p-2 flex flex-col gap-1.5 max-h-96 overflow-y-auto scrollbar-thin">
                  {displaySlots.length === 0 ? (
                    <div className="text-[11px] text-gray-400 text-center py-6">No slots</div>
                  ) : (
                    displaySlots.map((slot) => {
                      const isAvailable = slot.status === 'Available';
                      const priceMismatch =
                        rescheduling && isAvailable && targetPrice !== undefined && slot.price !== targetPrice;
                      const startTime = format(new Date(slot.slotStart), 'HH:mm');

                      return (
                        <button
                          key={slot.slotStart}
                          disabled={!isAvailable || priceMismatch}
                          onClick={() => onSlotSelect(slot, day)}
                          className={`w-full py-2 px-2 rounded-xl text-left transition-all duration-150 flex flex-col justify-between cursor-pointer border ${
                            !isAvailable
                              ? 'bg-gray-50/60 text-gray-400 border-gray-100 cursor-not-allowed text-xs'
                              : priceMismatch
                              ? 'bg-amber-50/30 text-amber-600/60 border-amber-100 cursor-not-allowed'
                              : 'bg-emerald-50/40 hover:bg-emerald-600 hover:text-white border-emerald-100/80 shadow-xs active:scale-98'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 opacity-70" />
                              {startTime}
                            </span>
                            {isAvailable && (
                              <span className="font-extrabold text-[11px]">
                                {formatPrice(slot.price)}
                              </span>
                            )}
                          </div>
                          {!isAvailable && (
                            <span className="text-[9px] uppercase font-semibold opacity-75">
                              {slot.status}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
