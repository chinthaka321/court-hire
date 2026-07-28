import type { SlotInfo } from '../types';
import { formatTime, formatPrice, cn } from '../lib/utils';

interface Props {
  slot: SlotInfo;
  selected?: boolean;
  onClick?: () => void;
  /** Reschedule mode: slot is open but costs a different amount than the
   *  original booking, so tapping it would always be rejected (ADR-0004). */
  priceMismatch?: boolean;
}

function statusLabel(slot: SlotInfo, isMismatch: boolean): string {
  if (isMismatch) return 'different price';
  switch (slot.status) {
    case 'Available': return 'available';
    case 'Held': return slot.heldByMe ? 'your checkout in progress' : 'held by another user';
    case 'Booked': return 'booked';
    case 'BlackedOut': return 'closed';
    case 'Past': return 'past';
    case 'BeyondHorizon': return 'not yet open for booking';
    default: return '';
  }
}

export function SlotCell({ slot, selected, onClick, priceMismatch }: Props) {
  const isAvailable = slot.status === 'Available' && !priceMismatch;
  const isMismatch = slot.status === 'Available' && !!priceMismatch;
  const isHeld = slot.status === 'Held';
  const isBooked = slot.status === 'Booked';
  const isPast = slot.status === 'Past' || slot.status === 'BlackedOut' || slot.status === 'BeyondHorizon';

  return (
    <div
      role="button"
      tabIndex={isAvailable ? 0 : -1}
      aria-disabled={!isAvailable}
      aria-label={`${formatTime(slot.slotStart)} to ${formatTime(slot.slotEnd)}, ${statusLabel(slot, isMismatch)}${isAvailable ? `, ${formatPrice(slot.price)}` : ''}`}
      onClick={isAvailable ? onClick : undefined}
      onKeyDown={isAvailable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      className={cn(
        'group flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100 last:border-b-0 transition-all duration-300',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
        isAvailable && 'cursor-pointer hover:bg-emerald-50/40 active:bg-primary-light',
        isMismatch && 'bg-gray-50/40 cursor-not-allowed opacity-60',
        isHeld && 'bg-amber-50/40 cursor-not-allowed',
        isBooked && 'bg-gray-50/60 cursor-not-allowed',
        isPast && 'bg-gray-50/30 opacity-50 cursor-not-allowed',
        selected && 'bg-primary-light border-l-4 border-l-primary',
      )}
    >
      <div aria-hidden="true" className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {isAvailable && (
          <div className={cn(
            'w-2 h-2 rounded-full shrink-0 transition-all duration-300',
            'bg-primary group-hover:scale-125 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.8)]',
          )} />
        )}
        {isMismatch && <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />}
        {isHeld && <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
        {isBooked && <div className="w-2 h-2 rounded-full bg-gray-300 shrink-0" />}
        {isPast && <div className="w-2 h-2 rounded-full bg-gray-200 shrink-0" />}

        <span className={cn(
          'text-sm sm:text-base font-semibold tracking-tight transition-colors duration-200 truncate',
          isAvailable ? 'text-on-surface group-hover:text-primary-dark' : 'text-gray-400',
        )}>
          {formatTime(slot.slotStart)}
          <span className={cn('text-xs sm:text-sm font-normal ml-1', isAvailable ? 'text-gray-400' : 'text-gray-300')}>
            – {formatTime(slot.slotEnd)}
          </span>
        </span>
      </div>

      <div aria-hidden="true" className="flex items-center gap-2 sm:gap-4 shrink-0">
        {isAvailable && (
          <>
            <span className="text-sm sm:text-base font-bold text-on-surface-muted group-hover:text-primary-dark transition-colors duration-200">
              {formatPrice(slot.price)}
            </span>
            <span className="flex items-center gap-1 sm:gap-1.5 text-xs font-bold text-white bg-primary px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 shadow-md shadow-primary/10 group-hover:bg-primary-dark group-hover:shadow-lg group-hover:scale-103 group-hover:-translate-x-0.5 active:scale-95">
              <span className="hidden sm:inline">Book Now</span>
              <span className="sm:hidden">Book</span>
              <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.0" className="w-3 h-3 transition-transform duration-300 group-hover:translate-x-0.5">
                <path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </>
        )}
        {isMismatch && (
          <>
            <span className="text-sm font-semibold text-gray-400">{formatPrice(slot.price)}</span>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full" title="Reschedules must match the original price — cancel and rebook for a different-priced time.">
              Different price
            </span>
          </>
        )}
        {isHeld && (
          <span className="text-xs font-semibold text-amber-700 bg-amber-100/60 px-3 py-1 rounded-full border border-amber-200/50">
            {slot.heldByMe ? 'Your checkout in progress' : 'Held'}
          </span>
        )}
        {isBooked && (
          <span className="text-xs font-semibold text-gray-500 bg-gray-200/60 px-3 py-1 rounded-full">
            Booked
          </span>
        )}
        {slot.status === 'BlackedOut' && (
          <span className="text-xs font-semibold text-gray-400 bg-gray-100/60 px-3 py-1 rounded-full">
            Closed
          </span>
        )}
        {slot.status === 'Past' && (
          <span className="text-xs font-medium text-gray-300 px-2.5">Past</span>
        )}
        {slot.status === 'BeyondHorizon' && (
          <span className="text-xs font-semibold text-gray-400 bg-gray-100/60 px-3 py-1 rounded-full">
            Not yet open
          </span>
        )}
      </div>
    </div>
  );
}
