import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCourt, getAvailability, createHold, apiErrorMessage } from '../lib/api';
import type { Court, SlotInfo } from '../types';
import { formatDateTime, formatPrice } from '../lib/utils';

export function BookingConfirmation() {
  const { courtId, slotStart } = useParams<{ courtId: string; slotStart: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const price = parseFloat(searchParams.get('price') ?? '0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotDate = decodeURIComponent(slotStart!);
  const slotCount = parseInt(searchParams.get('slotCount') ?? '2');

  const { data: court } = useQuery<Court>({
    queryKey: ['court', courtId],
    queryFn: () => getCourt(courtId!),
  });

  const durationMinutes = court ? slotCount * court.slotLengthMinutes : 30;
  const slotEnd = new Date(new Date(slotDate).getTime() + durationMinutes * 60_000).toISOString();

  // Fetch real-time availability to make sure the slot isn't already booked/held
  const dateOnlyString = slotDate.split('T')[0];
  const { data: availability = [], isLoading: loadingAvailability } = useQuery<SlotInfo[]>({
    queryKey: ['availability', courtId, dateOnlyString],
    queryFn: () => getAvailability(courtId!, dateOnlyString),
    enabled: !!courtId && !!court,
  });

  const baseLength = court?.slotLengthMinutes ?? 30;
  const slotTimesToCheck = Array.from({ length: slotCount }).map((_, idx) => {
    return new Date(new Date(slotDate).getTime() + idx * baseLength * 60_000).toISOString();
  });

  const isSlotUnavailable = !loadingAvailability && court && availability.length > 0 && slotTimesToCheck.some(timeStr => {
    const s = availability.find(x => new Date(x.slotStart).getTime() === new Date(timeStr).getTime());
    return !s || s.status !== 'Available';
  });

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const { checkoutUrl } = await createHold(courtId!, slotDate, slotCount);
      window.location.href = checkoutUrl;
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Slot is no longer available.'));
      setLoading(false);
    }
  }

  if (!court) {
    return <div className="p-8 text-center text-sm text-on-surface-muted">Loading…</div>;
  }


  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-primary font-medium mb-6 hover:underline"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-bold text-on-surface mb-6">Confirm Booking</h1>

      {/* Booking details */}
      <div className="bg-white rounded-xl border border-surface-high divide-y divide-[#f0f0f0] mb-4">
        <Row label="Court"      value={court.name} />
        <Row label="Date & Time" value={formatDateTime(slotDate)} />
        <Row label="Session Duration" value={`${durationMinutes} min`} />
        <Row label="Ends"       value={formatDateTime(slotEnd)} />
      </div>

      {/* Price summary */}
      <div className="bg-primary-light rounded-xl px-5 py-4 flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-on-surface">Total</span>
        <span className="text-2xl font-bold text-primary">{price ? formatPrice(price) : '—'}</span>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3.5 text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {isSlotUnavailable && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-semibold flex items-start gap-2 animate-pulse">
          <span>⚠️</span>
          <span>This slot is no longer available. It may have been booked or held by another user. Please go back and select a different slot.</span>
        </div>
      )}

      <p className="text-xs font-semibold text-on-surface-muted text-center mb-6 max-w-sm mx-auto leading-normal">
        ⚠️ Viewing this page does not lock the slot. The court is only reserved for 7 minutes once you click &quot;Pay Now&quot; to proceed.
      </p>

      <button
        onClick={handlePay}
        disabled={loading || loadingAvailability || isSlotUnavailable}
        className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl text-base hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? 'Please wait…' : isSlotUnavailable ? 'Slot Unavailable' : <>Pay Now <span className="text-lg">›</span></>}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-sm text-on-surface-muted">{label}</span>
      <span className="text-sm font-semibold text-on-surface">{value}</span>
    </div>
  );
}
