import { SlotInfo } from '../types';
import { formatTime, formatPrice, cn } from '../lib/utils';

interface Props {
  slot: SlotInfo;
  selected?: boolean;
  onClick?: () => void;
}

const statusStyle: Record<string, string> = {
  Available:  'bg-white hover:bg-[#e8f5ee] cursor-pointer border-b border-[#f0f0f0]',
  Held:       'bg-amber-50 cursor-not-allowed border-b border-[#f0f0f0]',
  Booked:     'bg-red-50 cursor-not-allowed border-b border-[#f0f0f0]',
  Past:       'bg-[#f8faf5] opacity-40 cursor-not-allowed border-b border-[#f0f0f0]',
  BlackedOut: 'bg-gray-100 cursor-not-allowed border-b border-[#f0f0f0]',
};

export function SlotCell({ slot, selected, onClick }: Props) {
  const isAvailable = slot.status === 'Available';

  return (
    <div
      onClick={isAvailable ? onClick : undefined}
      className={cn(
        'flex items-center justify-between px-4 transition-colors',
        statusStyle[slot.status],
        selected && 'bg-[#e8f5ee] border-l-[3px] border-l-[#1b5e3b]',
      )}
      style={{ height: '56px' }}
    >
      <span className="text-sm font-bold text-[#191c19]">{formatTime(slot.slotStart)}</span>
      <div className="flex items-center gap-3">
        {slot.status === 'Available' && (
          <span className="text-sm text-[#404942]">{formatPrice(slot.price)}</span>
        )}
        <span className={cn(
          'text-xs font-medium',
          slot.status === 'Available' ? 'text-[#006e2d]' :
          slot.status === 'Held' ? 'text-amber-600' :
          slot.status === 'Booked' ? 'text-red-600' : 'text-gray-400'
        )}>
          {slot.status === 'Available' ? 'Open' :
           slot.status === 'Held' ? 'Held' :
           slot.status === 'Booked' ? 'Booked' :
           slot.status === 'BlackedOut' ? 'Closed' : 'Past'}
        </span>
      </div>
    </div>
  );
}
