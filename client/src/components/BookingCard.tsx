import type { Booking } from '../types';
import { formatDateTime, formatPrice } from '../lib/utils';

interface Props {
  booking: Booking;
  onCancel?: () => void;
  onReschedule?: () => void;
}

const stateConfig: Record<string, { label: string; cls: string }> = {
  Completed: { label: 'Confirmed',  cls: 'bg-green-100 text-green-700' },
  Cancelled: { label: 'Cancelled',  cls: 'bg-gray-100 text-gray-500'  },
  NoShow:    { label: 'No-show',    cls: 'bg-red-100 text-red-600'    },
};

export function BookingCard({ booking, onCancel, onReschedule }: Props) {
  const slotStart = booking.slotStarts[0];
  const isUpcoming = new Date(slotStart) > new Date();
  const canAct = booking.state === 'Completed' && isUpcoming;
  const { label, cls } = stateConfig[booking.state] ?? { label: booking.state, cls: 'bg-gray-100 text-gray-500' };

  return (
    <div className={`bg-white rounded-xl border p-4 sm:p-5 transition-colors ${
      isUpcoming && booking.state === 'Completed'
        ? 'border-[#1b5e3b]/20 hover:border-[#1b5e3b]/40'
        : 'border-[#e6e9e4]'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-[#191c19]">{booking.court.name}</p>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cls}`}>
              {label}
            </span>
          </div>
          <p className="text-sm text-[#404942] mt-1">{formatDateTime(slotStart)}</p>
          <p className="text-xs text-[#404942] mt-0.5">ID: {booking.id.slice(0, 8).toUpperCase()}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-[#191c19] text-lg">{formatPrice(booking.amountCharged)}</p>
        </div>
      </div>

      {canAct && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-[#f0f0f0]">
          <button
            onClick={onReschedule}
            className="flex-1 text-sm font-semibold text-[#1b5e3b] py-2 rounded-lg border border-[#1b5e3b] hover:bg-[#e8f5ee] transition-colors"
          >
            Reschedule
          </button>
          <button
            onClick={onCancel}
            className="flex-1 text-sm font-medium text-[#404942] py-2 rounded-lg border border-[#bfc9bf] hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
