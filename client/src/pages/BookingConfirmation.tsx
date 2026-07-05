import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCourt, createHold, apiErrorMessage } from '../lib/api';
import type { Court } from '../types';
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

  const durationMinutes = slotCount * court.slotLengthMinutes;
  const slotEnd = new Date(new Date(slotDate).getTime() + durationMinutes * 60_000).toISOString();

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
        <Row label="Duration"   value={`${durationMinutes} min`} />
        <Row label="Ends"       value={formatDateTime(slotEnd)} />
      </div>

      {/* Price summary */}
      <div className="bg-primary-light rounded-xl px-5 py-4 flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-on-surface">Total</span>
        <span className="text-2xl font-bold text-primary">{price ? formatPrice(price) : '—'}</span>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <p className="text-xs text-on-surface-muted text-center mb-6">
        Your slot will be held for 7 minutes while you complete payment on Stripe.
      </p>

      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl text-base hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? 'Please wait…' : <>Pay Now <span className="text-lg">›</span></>}
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
