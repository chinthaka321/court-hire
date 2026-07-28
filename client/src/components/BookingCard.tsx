import type { Booking } from '../types';
import { formatDateTime, formatPrice } from '../lib/utils';
import { asWallClock, courtNow } from '../lib/courtTime';
import { bookingDurationMinutes } from '../lib/booking';
import { Button } from './ui/Button';
import { Calendar, Clock, RefreshCw, XCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  booking: Booking;
  onCancel?: () => void;
  onReschedule?: () => void;
}

const stateConfig: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  Completed: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
  Cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: XCircle },
  NoShow: { label: 'No-show', cls: 'bg-rose-100 text-rose-800 border-rose-200', icon: XCircle },
};

export function BookingCard({ booking, onCancel, onReschedule }: Props) {
  const slotStart = booking.slotStarts[0];
  const isUpcoming = asWallClock(slotStart) > courtNow();
  const canAct = booking.state === 'Completed' && isUpcoming;
  const { label, cls, icon: StateIcon } = stateConfig[booking.state] ?? {
    label: booking.state,
    cls: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: CheckCircle2,
  };

  const durationMinutes = bookingDurationMinutes(booking);

  return (
    <div
      className={`bg-white rounded-3xl border p-5 sm:p-6 transition-all duration-300 shadow-xl shadow-slate-200/40 ${
        isUpcoming && booking.state === 'Completed'
          ? 'border-emerald-500/30 hover:border-emerald-500/60 hover:shadow-2xl'
          : 'border-slate-200 bg-slate-50/60'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-black text-slate-900 text-lg tracking-tight">{booking.court.name}</h3>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${cls}`}
            >
              <StateIcon className="w-3 h-3" />
              {label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 mt-2">
            <span className="flex items-center gap-1 text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              {formatDateTime(slotStart)}
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {durationMinutes} min session
            </span>
          </div>

          <p className="text-[11px] font-mono font-bold text-slate-400 mt-2">
            ID: #{booking.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-2xl font-black text-slate-900">{formatPrice(booking.amountCharged)}</span>
        </div>
      </div>

      {canAct && (
        <div className="flex gap-3 mt-5 pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 rounded-xl font-extrabold border-slate-300 hover:border-emerald-500 hover:text-emerald-600"
            onClick={onReschedule}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reschedule Time
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="flex-1 rounded-xl font-extrabold"
            onClick={onCancel}
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancel Reservation
          </Button>
        </div>
      )}
    </div>
  );
}
