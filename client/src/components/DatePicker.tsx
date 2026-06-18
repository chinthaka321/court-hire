import { addDays, format, isSameDay, startOfWeek } from 'date-fns';

interface Props {
  selected: Date;
  onSelect: (date: Date) => void;
  horizonDays?: number;
}

export function DatePicker({ selected, onSelect, horizonDays = 14 }: Props) {
  const today = new Date();
  const weekStart = startOfWeek(selected, { weekStartsOn: 1 });

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 px-4">
      {Array.from({ length: 7 }, (_, i) => {
        const day = addDays(weekStart, i);
        const isPast = day < today && !isSameDay(day, today);
        const isBeyondHorizon = day > addDays(today, horizonDays);
        const isSelected = isSameDay(day, selected);
        const disabled = isPast || isBeyondHorizon;

        return (
          <button
            key={i}
            disabled={disabled}
            onClick={() => !disabled && onSelect(day)}
            className={`flex flex-col items-center justify-center rounded-lg flex-shrink-0 transition-colors
              ${isSelected
                ? 'bg-[#1b5e3b] text-white'
                : disabled
                  ? 'opacity-30 cursor-not-allowed'
                  : 'bg-white hover:bg-[#e8f5ee] text-[#191c19]'
              }`}
            style={{ width: '44px', height: '44px' }}
          >
            <span className="text-[11px] font-normal leading-none">
              {format(day, 'EEE')[0]}
            </span>
            <span className="text-[17px] font-bold leading-none mt-0.5">
              {format(day, 'd')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
