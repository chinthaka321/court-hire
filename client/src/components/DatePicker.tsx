import { addDays, format, isSameDay, startOfWeek, isToday } from 'date-fns';

interface Props {
  selected: Date;
  onSelect: (date: Date) => void;
  horizonDays?: number;
}

export function DatePicker({ selected, onSelect, horizonDays = 14 }: Props) {
  const today = new Date();
  const weekStart = startOfWeek(selected, { weekStartsOn: 1 });

  function prevWeek() {
    const prev = addDays(weekStart, -7);
    const clampedDay = prev < today ? today : prev;
    onSelect(clampedDay);
  }

  function nextWeek() {
    const next = addDays(weekStart, 7);
    if (next <= addDays(today, horizonDays)) onSelect(next);
  }

  const canGoPrev = weekStart > today;
  const canGoNext = addDays(weekStart, 7) <= addDays(today, horizonDays);

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevWeek}
          disabled={!canGoPrev}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[#404942] hover:bg-[#f0f0f0] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 010 .708L5.707 8l5.647 5.646a.5.5 0 01-.708.708l-6-6a.5.5 0 010-.708l6-6a.5.5 0 01.708 0z" clipRule="evenodd" />
          </svg>
        </button>
        <span className="text-xs font-semibold text-[#404942]">
          {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d')}
        </span>
        <button
          onClick={nextWeek}
          disabled={!canGoNext}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[#404942] hover:bg-[#f0f0f0] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 01.708 0l6 6a.5.5 0 010 .708l-6 6a.5.5 0 01-.708-.708L10.293 8 4.646 2.354a.5.5 0 010-.708z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Day buttons */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => {
          const day = addDays(weekStart, i);
          const isPast = day < today && !isSameDay(day, today);
          const isBeyondHorizon = day > addDays(today, horizonDays);
          const isSelected = isSameDay(day, selected);
          const isTodayDay = isToday(day);
          const disabled = isPast || isBeyondHorizon;

          return (
            <button
              key={i}
              disabled={disabled}
              onClick={() => !disabled && onSelect(day)}
              className={`flex flex-col items-center justify-center rounded-xl py-2 transition-all ${
                isSelected
                  ? 'bg-[#1b5e3b] text-white shadow-sm'
                  : disabled
                  ? 'opacity-25 cursor-not-allowed text-[#404942]'
                  : 'hover:bg-[#f0f7f3] text-[#191c19]'
              }`}
            >
              <span className={`text-[10px] font-medium leading-none mb-1 ${isSelected ? 'text-white/70' : 'text-[#404942]'}`}>
                {format(day, 'EEE')}
              </span>
              <span className="text-base font-bold leading-none">{format(day, 'd')}</span>
              {isTodayDay && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-[#1b5e3b] mt-1" />
              )}
              {isTodayDay && isSelected && (
                <span className="w-1 h-1 rounded-full bg-white/60 mt-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
