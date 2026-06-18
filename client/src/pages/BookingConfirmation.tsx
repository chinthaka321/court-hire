import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCourt, createHold } from '../lib/api';
import { BottomActionBar } from '../components/BottomActionBar';
import { Court } from '../types';
import { formatDateTime, formatPrice } from '../lib/utils';

export function BookingConfirmation() {
  const { courtId, slotStart } = useParams<{ courtId: string; slotStart: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slotDate = decodeURIComponent(slotStart!);

  const { data: court } = useQuery<Court>({
    queryKey: ['court', courtId],
    queryFn: () => getCourt(courtId!),
  });

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const { checkoutUrl } = await createHold(courtId!, slotDate);
      window.location.href = checkoutUrl;
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Slot is no longer available.');
      setLoading(false);
    }
  }

  if (!court) return <div className="p-8 text-center text-[#404942]">Loading…</div>;

  const slotEnd = new Date(new Date(slotDate).getTime() + court.slotLengthMinutes * 60_000).toISOString();

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <button onClick={() => navigate(-1)} className="text-sm text-[#1b5e3b] mb-4">← Back</button>

      <h1 className="text-xl font-bold text-[#191c19] mb-6">Confirm Booking</h1>

      <div className="bg-white rounded-xl border border-[#e6e9e4] divide-y divide-[#f0f0f0]">
        <Row label="Court" value={court.name} />
        <Row label="Date & Time" value={formatDateTime(slotDate)} />
        <Row label="Duration" value={`${court.slotLengthMinutes} min`} />
        <Row label="Ends" value={formatDateTime(slotEnd)} />
      </div>

      <div className="mt-4 bg-[#e8f5ee] rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm font-medium text-[#191c19]">Total</span>
        <span className="text-lg font-bold text-[#1b5e3b]">Loading price…</span>
      </div>

      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <p className="mt-4 text-xs text-[#404942] text-center">
        You'll be redirected to Stripe to complete payment. Your slot will be held for 7 minutes.
      </p>

      <BottomActionBar
        label="Pay Now"
        onClick={handlePay}
        loading={loading}
        disabled={!!error}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-[#404942]">{label}</span>
      <span className="text-sm font-medium text-[#191c19]">{value}</span>
    </div>
  );
}
