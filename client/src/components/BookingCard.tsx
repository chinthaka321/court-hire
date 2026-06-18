import { Booking } from '../types';
import { formatDateTime, formatPrice } from '../lib/utils';

interface Props {
  booking: Booking;
  onCancel?: () => void;
  onReschedule?: () => void;
}

const stateColor: Record<string, string> = {
  Completed: 'text-[#006e2d]',
  Cancelled: 'text-gray-400',
  NoShow: 'text-red-600',
};

export function BookingCard({ booking, onCancel, onReschedule }: Props) {
  const slotStart = booking.slotStarts[0];
  const isUpcoming = new Date(slotStart) > new Date();
  const canAct = booking.state === 'Completed' && isUpcoming;

  return (
    <div className="bg-white rounded-xl p-4 border border-[#e6e9e4]">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-[#191c19]">{booking.court.name}</p>
          <p className="text-sm text-[#404942] mt-0.5">{formatDateTime(slotStart)}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-[#191c19]">{formatPrice(booking.amountCharged)}</p>
          <p className={`text-xs font-medium mt-0.5 ${stateColor[booking.state]}`}>
            {booking.state}
          </p>
        </div>
      </div>

      {canAct && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-[#f0f0f0]">
          <button
            onClick={onReschedule}
            className="flex-1 text-sm font-medium text-[#1b5e3b] py-2 rounded-lg border border-[#1b5e3b] hover:bg-[#e8f5ee] transition-colors"
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
