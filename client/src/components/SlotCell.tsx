import type { SlotInfo } from '../types';
import { formatTime, formatPrice, cn } from '../lib/utils';

interface Props {
  slot: SlotInfo;
  selected?: boolean;
  onClick?: () => void;
}

export function SlotCell({ slot, selected, onClick }: Props) {
  const isAvailable = slot.status === 'Available';
  const isHeld = slot.status === 'Held';
  const isBooked = slot.status === 'Booked';
  const isPast = slot.status === 'Past' || slot.status === 'BlackedOut';

  return (
    <div
      onClick={isAvailable ? onClick : undefined}
      className={cn(
        'group flex items-center justify-between px-4 sm:px-5 border-b border-[#f0f0f0] last:border-b-0 transition-all',
        isAvailable && 'cursor-pointer hover:bg-[#f0f7f3] active:bg-primary-light',
        isHeld && 'bg-amber-50/60 cursor-not-allowed',
        isBooked && 'bg-[#fafafa] cursor-not-allowed',
        isPast && 'bg-[#fafafa] opacity-40 cursor-not-allowed',
        selected && 'bg-primary-light border-l-2 border-l-primary',
      )}
      style={{ minHeight: '64px' }}
    >
      {/* Left: time */}
      <div className="flex items-center gap-3">
        {isAvailable && (
          <div className={cn(
            'w-2 h-2 rounded-full shrink-0 transition-colors',
            'bg-primary group-hover:bg-primary',
          )} />
        )}
        {isHeld && <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
        {isBooked && <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />}
        {isPast && <div className="w-2 h-2 rounded-full bg-gray-200 shrink-0" />}

        <span className={cn(
          'text-base font-bold',
          isAvailable ? 'text-on-surface' : 'text-[#9aab9a]',
        )}>
          {formatTime(slot.slotStart)}
          <span className={cn('text-sm font-normal ml-1', isAvailable ? 'text-on-surface-muted' : 'text-outline-variant')}>
            – {formatTime(slot.slotEnd)}
          </span>
        </span>
      </div>

      {/* Right: price + status + CTA */}
      <div className="flex items-center gap-3">
        {isAvailable && (
          <>
            <span className="text-sm font-semibold text-on-surface-muted">{formatPrice(slot.price)}</span>
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-white bg-primary px-3.5 py-1.5 rounded-lg group-hover:bg-primary-dark transition-colors">
              Book
              <svg viewBox="0 0 12 12" fill="currentColor" className="w-2.5 h-2.5">
                <path d="M1 6h10M6.5 1.5L11 6l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </span>
          </>
        )}
        {isHeld && (
          <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2.5 py-1 rounded-full">
            Held
          </span>
        )}
        {isBooked && (
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            Booked
          </span>
        )}
        {slot.status === 'BlackedOut' && (
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            Closed
          </span>
        )}
        {slot.status === 'Past' && (
          <span className="text-xs text-gray-300">Past</span>
        )}
      </div>
    </div>
  );
}
