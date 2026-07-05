import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { pollBookingByHoldGroup } from '../lib/api';

export function BookingConfirming() {
  const [params] = useSearchParams();
  const holdGroupId = params.get('holdGroupId');
  const navigate = useNavigate();
  const [pollError, setPollError] = useState<'timeout' | 'expired' | null>(null);
  const error = holdGroupId ? pollError : 'timeout';

  useEffect(() => {
    if (!holdGroupId) return;

    let attempts = 0;
    const interval = setInterval(async () => {
      try {
        const result = await pollBookingByHoldGroup(holdGroupId);
        if (result.status === 'confirmed') {
          clearInterval(interval);
          navigate(`/booking/confirmed/${result.bookingId}`, { replace: true });
          return;
        }
        if (result.status === 'expired') {
          clearInterval(interval);
          setPollError('expired');
          return;
        }
      } catch {
        // continue polling
      }

      attempts += 1;
      if (attempts >= 15) { // 30s max
        clearInterval(interval);
        setPollError('timeout');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [holdGroupId, navigate]);

  if (error === 'expired') {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-lg font-bold text-on-surface">Payment not completed</h2>
        <p className="text-sm text-on-surface-muted mt-2">
          Your hold on the slot expired before payment finished, so no booking was made.
          If you were charged, the payment will be refunded automatically.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 text-primary font-medium text-sm"
        >
          Book again →
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-lg font-bold text-on-surface">Confirmation timed out</h2>
        <p className="text-sm text-on-surface-muted mt-2">
          Your payment may still be processing. Check your email for confirmation.
        </p>
        <button
          onClick={() => navigate('/my-bookings')}
          className="mt-6 text-primary font-medium text-sm"
        >
          View My Bookings →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-20 text-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
      <h2 className="text-lg font-bold text-on-surface">Confirming your booking…</h2>
      <p className="text-sm text-on-surface-muted mt-2">Please don't close this tab.</p>
    </div>
  );
}
