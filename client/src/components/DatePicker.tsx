import { addDays, format, isSameDay, isToday } from 'date-fns';

interface Props {
  selected: Date;
  onSelect: (date: Date) => void;
  horizonDays?: number;
}

export function DatePicker({ selected, onSelect, horizonDays = 14 }: Props) {
  const today = new Date();

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 pt-1 scrollbar-none snap-x snap-mandatory">
      {Array.from({ length: horizonDays + 1 }, (_, i) => {
        const day = addDays(today, i);
        const isSelected = isSameDay(day, selected);
        const isTodayDay = isToday(day);

        return (
          <button
            key={i}
            onClick={() => onSelect(day)}
            className={`flex flex-col items-center justify-center rounded-2xl py-3 px-4.5 min-w-[72px] snap-start transition-all duration-300 cursor-pointer border ${
              isSelected
                ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-102 font-bold'
                : 'bg-white text-on-surface border-gray-100 hover:border-primary/30 hover:bg-emerald-50/10'
            }`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isSelected ? 'text-white/80' : 'text-on-surface-muted'}`}>
              {isTodayDay ? 'Today' : format(day, 'EEE')}
            </span>
            <span className="text-lg font-extrabold leading-none">{format(day, 'd')}</span>
            <span className={`text-[10px] mt-1 font-semibold uppercase tracking-wider ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
              {format(day, 'MMM')}
            </span>
          </button>
        );
      })}
    </div>
  );
}
