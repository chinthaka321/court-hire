import { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { addDays, format, isSameDay } from 'date-fns';
import { getAvailability } from '../lib/api';
import { type DisplaySlot, groupSlots } from '../lib/slots';
import { toDateOnlyString, formatPrice, formatTime } from '../lib/utils';
import { courtNow } from '../lib/courtTime';
import { Calendar, ChevronLeft, ChevronRight, Clock, AlertCircle, Filter } from 'lucide-react';

interface WeekViewProps {
  startDate: Date;
  activeCourt: string;
  durationMinutes: number;
  rescheduling: boolean;
  targetPrice?: number;
  onSlotSelect: (slot: DisplaySlot, date: Date) => void;
  onDateChange?: (newDate: Date) => void;
}

interface DayColumnProps {
  day: Date;
  displaySlots: DisplaySlot[];
  openSlotCount: number;
  isToday: boolean;
  isMobileSingleDay: boolean;
  showOpenOnly: boolean;
  rescheduling: boolean;
  targetPrice?: number;
  onSlotSelect: (slot: DisplaySlot, date: Date) => void;
}

function DayColumn({
  day,
  displaySlots,
  openSlotCount,
  isToday,
  isMobileSingleDay,
  showOpenOnly,
  rescheduling,
  targetPrice,
  onSlotSelect,
}: DayColumnProps) {
  return (
    <div
      className={`flex flex-col rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs ${
        isToday
          ? 'border-emerald-500/50 bg-emerald-50/20 shadow-md ring-1 ring-emerald-500/30'
          : 'border-slate-200 bg-white hover:border-emerald-300'
      }`}
    >
      <div
        className={`p-3 text-center border-b ${
          isToday ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-800'
        }`}
      >
        <span className="text-[10px] uppercase font-black tracking-widest block opacity-90">
          {format(day, 'EEE')}
        </span>
        <span className="text-base font-black leading-tight block my-0.5">
          {format(day, 'MMM d')}
        </span>
        <span
          className={`text-[10px] font-black inline-block px-2.5 py-0.5 rounded-full ${
            isToday
              ? 'bg-white/20 text-white'
              : openSlotCount > 0
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              : 'bg-slate-200 text-slate-600'
          }`}
        >
          {openSlotCount} open
        </span>
      </div>

      <div
        className={`p-2 flex flex-col gap-2 overflow-y-auto scrollbar-thin ${
          isMobileSingleDay ? 'max-h-[500px]' : 'max-h-[420px]'
        }`}
      >
        {displaySlots.length === 0 ? (
          <div className="text-[11px] font-medium text-slate-400 text-center py-8">
            {showOpenOnly ? 'No open slots' : 'No slots available'}
          </div>
        ) : (
          displaySlots.map((slot) => {
            const isAvailable = slot.status === 'Available';
            const priceMismatch =
              rescheduling && isAvailable && targetPrice !== undefined && slot.price !== targetPrice;
            const formattedTime = formatTime(slot.slotStart);

            return (
              <button
                key={slot.slotStart}
                disabled={!isAvailable || priceMismatch}
                onClick={() => onSlotSelect(slot, day)}
                className={`w-full py-2.5 px-2.5 rounded-xl text-left transition-all duration-150 flex flex-col justify-between cursor-pointer border ${
                  !isAvailable
                    ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed text-xs'
                    : priceMismatch
                    ? 'bg-amber-50/50 text-amber-700 border-amber-200 cursor-not-allowed'
                    : 'bg-emerald-50/50 hover:bg-emerald-600 hover:text-white border-emerald-200/80 shadow-xs active:scale-98 group'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full text-xs font-black">
                  <span className="flex items-center gap-1 truncate">
                    <Clock className="w-3 h-3 opacity-70 shrink-0" />
                    {formattedTime}
                  </span>
                  {isAvailable && !priceMismatch && (
                    <span className="font-black text-emerald-700 group-hover:text-white text-xs shrink-0">
                      {formatPrice(slot.price)}
                    </span>
                  )}
                </div>

                <div className="mt-1">
                  {priceMismatch && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-0.5">
                      <AlertCircle className="w-2.5 h-2.5 shrink-0" /> Diff price
                    </span>
                  )}
                  {!isAvailable && (
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-75">
                      {slot.status === 'BlackedOut'
                        ? 'Closed'
                        : slot.status === 'BeyondHorizon'
                        ? 'Not Open'
                        : slot.status}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function WeekView({
  startDate,
  activeCourt,
  durationMinutes,
  rescheduling,
  targetPrice,
  onSlotSelect,
  onDateChange,
}: WeekViewProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [mobileSelectedDayIndex, setMobileSelectedDayIndex] = useState(0);
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  const weekDays = useMemo(() => {
    const baseDate = addDays(startDate, weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(baseDate, i));
  }, [startDate, weekOffset]);
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

  const perDayData = weekDays.map((day, idx) => {
    const rawSlots = dayQueries[idx].data || [];
    const allDisplaySlots = groupSlots(rawSlots, durationMinutes);
    const openSlots = allDisplaySlots.filter((s) => s.status === 'Available');
    return {
      day,
      openSlotCount: openSlots.length,
      displaySlots: showOpenOnly ? openSlots : allDisplaySlots,
      isToday: isSameDay(day, today),
    };
  });

  function handlePrevWeek() {
    const nextOffset = weekOffset - 1;
    setWeekOffset(nextOffset);
    setMobileSelectedDayIndex(0);
    onDateChange?.(addDays(startDate, nextOffset * 7));
  }

  function handleNextWeek() {
    const nextOffset = weekOffset + 1;
    setWeekOffset(nextOffset);
    setMobileSelectedDayIndex(0);
    onDateChange?.(addDays(startDate, nextOffset * 7));
  }

  function handleToday() {
    setWeekOffset(0);
    setMobileSelectedDayIndex(0);
    onDateChange?.(startDate);
  }

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">7-Day Court Overview</h3>
            <p className="text-xs font-semibold text-slate-400">
              {format(weekDays[0], 'MMM d')} – {format(weekDays[6], 'MMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowOpenOnly(!showOpenOnly)}
            className={`flex items-center gap-1.5 text-xs font-extrabold px-3 py-2 rounded-xl transition-all cursor-pointer border min-h-[44px] ${
              showOpenOnly
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showOpenOnly ? 'Open Slots Only' : 'All Slots'}</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevWeek}
              className="flex items-center gap-1 text-xs font-extrabold text-slate-700 bg-slate-100 hover:bg-emerald-600 hover:text-white px-3 py-2 rounded-xl transition-all cursor-pointer min-h-[44px]"
              title="Previous 7 Days"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={handleToday}
                className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl hover:bg-emerald-100 transition-all cursor-pointer min-h-[44px]"
              >
                Today
              </button>
            )}
            <button
              onClick={handleNextWeek}
              className="flex items-center gap-1 text-xs font-extrabold text-slate-700 bg-slate-100 hover:bg-emerald-600 hover:text-white px-3 py-2 rounded-xl transition-all cursor-pointer min-h-[44px]"
              title="Next 7 Days"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="block md:hidden mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
          {perDayData.map(({ day, openSlotCount, isToday }, idx) => {
            const isSelectedDay = mobileSelectedDayIndex === idx;

            return (
              <button
                key={toDateOnlyString(day)}
                onClick={() => setMobileSelectedDayIndex(idx)}
                className={`flex-1 min-w-[70px] py-2.5 px-3 rounded-2xl border text-center transition-all cursor-pointer snap-start min-h-[54px] flex flex-col items-center justify-center ${
                  isSelectedDay
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30 font-black scale-102'
                    : isToday
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                    : 'bg-slate-50 text-slate-700 border-slate-200 font-semibold hover:border-emerald-300'
                }`}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                  {format(day, 'EEE')}
                </span>
                <span className="text-sm font-black block leading-none my-0.5">
                  {format(day, 'd')}
                </span>
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                    isSelectedDay
                      ? 'bg-white/20 text-white'
                      : openSlotCount > 0
                      ? 'text-emerald-700 bg-emerald-100'
                      : 'text-slate-400 bg-slate-200'
                  }`}
                >
                  {openSlotCount} open
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 animate-pulse">
          {weekDays.map((_, idx) => (
            <div key={idx} className="h-64 bg-slate-100 rounded-2xl p-3 flex flex-col gap-2">
              <div className="h-6 bg-slate-200 rounded-lg w-full" />
              <div className="h-10 bg-slate-200 rounded-xl" />
              <div className="h-10 bg-slate-200 rounded-xl" />
              <div className="h-10 bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="hidden md:grid md:grid-cols-7 gap-3">
            {perDayData.map((data) => (
              <DayColumn
                key={toDateOnlyString(data.day)}
                {...data}
                isMobileSingleDay={false}
                showOpenOnly={showOpenOnly}
                rescheduling={rescheduling}
                targetPrice={targetPrice}
                onSlotSelect={onSlotSelect}
              />
            ))}
          </div>

          <div className="block md:hidden">
            <DayColumn
              {...perDayData[mobileSelectedDayIndex]}
              isMobileSingleDay
              showOpenOnly={showOpenOnly}
              rescheduling={rescheduling}
              targetPrice={targetPrice}
              onSlotSelect={onSlotSelect}
            />
          </div>
        </>
      )}
    </div>
  );
}
