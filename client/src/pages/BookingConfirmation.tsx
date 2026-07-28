import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCourt, getAvailability, createHold, adminCreateBooking, apiErrorMessage } from '../lib/api';
import type { Court, SlotInfo } from '../types';
import { formatDateTime, formatPrice } from '../lib/utils';
import { useMe } from '../hooks/useMe';
import { Button } from '../components/ui/Button';
import { Input, Field } from '../components/ui/Input';
import { useToast } from '../components/ui/ToastContext';
import { sanitizeInput } from '../lib/security';
import { ArrowLeft, Clock, AlertTriangle } from 'lucide-react';

export function BookingConfirmation() {
  const { courtId, slotStart } = useParams<{ courtId: string; slotStart: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const price = parseFloat(searchParams.get('price') ?? '0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const { isAdmin } = useMe();
  const { showToast } = useToast();
  const payerMissing = isAdmin && !payerName.trim() && !payerEmail.trim();

  const slotDate = decodeURIComponent(slotStart!);
  const slotCount = parseInt(searchParams.get('slotCount') ?? '2');

  const { data: court } = useQuery<Court>({
    queryKey: ['court', courtId],
    queryFn: () => getCourt(courtId!),
  });

  const durationMinutes = court ? slotCount * court.slotLengthMinutes : 30;
  const slotEnd = new Date(new Date(slotDate).getTime() + durationMinutes * 60_000).toISOString();

  const dateOnlyString = slotDate.split('T')[0];
  const { data: availability = [], isLoading: loadingAvailability } = useQuery<SlotInfo[]>({
    queryKey: ['availability', courtId, dateOnlyString],
    queryFn: () => getAvailability(courtId!, dateOnlyString),
    enabled: !!courtId && !!court,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const baseLength = court?.slotLengthMinutes ?? 30;
  const slotTimesToCheck = Array.from({ length: slotCount }).map((_, idx) => {
    return new Date(new Date(slotDate).getTime() + idx * baseLength * 60_000).toISOString();
  });

  const isSlotUnavailable = !loadingAvailability && court && availability.length > 0 && slotTimesToCheck.some(timeStr => {
    const s = availability.find(x => new Date(x.slotStart).getTime() === new Date(timeStr).getTime());
    return !s || (s.status !== 'Available' && !(s.status === 'Held' && s.heldByMe));
  });

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        await adminCreateBooking({
          courtId: courtId!,
          slotStart: slotDate,
          slotCount,
          notes: sanitizeInput(notes) || undefined,
          payerName: sanitizeInput(payerName) || undefined,
          payerEmail: sanitizeInput(payerEmail) || undefined,
        });
        showToast('Walk-in booking successfully created!', 'success');
        navigate('/admin/bookings');
        return;
      }
      showToast('Creating hold & redirecting to Stripe...', 'info');
      const { checkoutUrl } = await createHold(courtId!, slotDate, slotCount);
      window.location.href = checkoutUrl;
    } catch (e: unknown) {
      const msg = apiErrorMessage(e, 'Slot is no longer available.');
      setError(msg);
      showToast(msg, 'error');
      setLoading(false);
    }
  }

  if (!court) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full mb-6 hover:bg-emerald-100 transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Calendar
      </button>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-black text-slate-900 mb-6">Confirm Reservation</h1>

        <div className="bg-slate-50/80 rounded-2xl border border-slate-100 divide-y divide-slate-100 mb-6 overflow-hidden">
          <Row label="Court" value={court.name} />
          <Row label="Date & Start Time" value={formatDateTime(slotDate)} />
          <Row label="Session Duration" value={`${durationMinutes} min`} />
          <Row label="Estimated End" value={formatDateTime(slotEnd)} />
        </div>

        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 rounded-2xl px-6 py-5 flex items-center justify-between text-white mb-6 shadow-md shadow-emerald-900/20">
          <div>
            <span className="text-xs uppercase font-bold text-emerald-200 tracking-wider block">Total Payable</span>
            <span className="text-xs text-emerald-100/70">Includes all taxes and court access</span>
          </div>
          <span className="text-3xl font-black text-white">{price ? formatPrice(price) : '—'}</span>
        </div>

        {isAdmin && (
          <div className="bg-amber-50/60 rounded-2xl border border-amber-200/60 p-5 mb-6">
            <p className="text-sm font-bold text-amber-950 mb-1">Walk-in Customer Booking</p>
            <p className="text-xs text-amber-800 mb-4">
              Recorded directly under your admin account for in-person payment.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Customer name" htmlFor="payer-name">
                <Input
                  id="payer-name"
                  type="text"
                  placeholder="e.g. John Smith"
                  value={payerName}
                  onChange={e => setPayerName(e.target.value)}
                />
              </Field>
              <Field label="Customer email" htmlFor="payer-email">
                <Input
                  id="payer-email"
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={payerEmail}
                  onChange={e => setPayerEmail(e.target.value)}
                />
              </Field>
            </div>
            {payerMissing && (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 mt-3">
                <AlertTriangle className="w-4 h-4" />
                Enter at least a name or an email for customer attribution.
              </p>
            )}
            <div className="mt-4">
              <Field label="Notes (optional)" htmlFor="admin-notes" hint="e.g. walk-in cash payment">
                <Input
                  id="admin-notes"
                  type="text"
                  placeholder="Additional notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-700 font-semibold shadow-xs">
            {error}
          </div>
        )}

        {isSlotUnavailable && (
          <div role="alert" className="mb-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-700 font-semibold flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>This slot is no longer available. It may have been booked or held by another user. Please go back and select a different slot.</span>
          </div>
        )}

        {!isAdmin && (
          <p className="flex items-center justify-center gap-2 text-xs font-medium text-slate-500 text-center mb-6 bg-slate-50 py-3 px-4 rounded-xl border border-slate-100">
            <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
            The court is held for 7 minutes once you click &quot;Pay Now&quot; to complete Stripe checkout.
          </p>
        )}

        <Button
          onClick={handlePay}
          disabled={loading || loadingAvailability || isSlotUnavailable || payerMissing}
          className="w-full py-4 text-base font-extrabold rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30"
        >
          {loading
            ? 'Processing...'
            : isSlotUnavailable
              ? 'Slot Unavailable'
              : isAdmin
                ? 'Create Walk-in Booking ›'
                : 'Proceed to Payment ›'}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-black text-slate-900">{value}</span>
    </div>
  );
}
