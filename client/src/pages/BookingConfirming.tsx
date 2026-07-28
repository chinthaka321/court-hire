import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { pollBookingByHoldGroup } from '../lib/api';
import { Button } from '../components/ui/Button';

function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-10 h-10 mx-auto mb-4 text-amber-500" aria-hidden="true">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l6.28 11.19c.75 1.334-.213 2.98-1.744 2.98H3.72c-1.53 0-2.493-1.646-1.744-2.98l6.28-11.19zM11 14a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.5a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3z" clipRule="evenodd" />
    </svg>
  );
}

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
      <div role="alert" className="max-w-lg mx-auto px-4 pt-20 text-center">
        <WarningIcon />
        <h2 className="text-lg font-bold text-on-surface">Payment not completed</h2>
        <p className="text-sm text-on-surface-muted mt-2">
          Your hold on the slot expired before payment finished, so no booking was made.
          If you were charged, the payment will be refunded automatically.
        </p>
        <Button variant="outline-primary" className="mt-6" onClick={() => navigate('/')}>
          Book again <span aria-hidden="true">→</span>
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="max-w-lg mx-auto px-4 pt-20 text-center">
        <WarningIcon />
        <h2 className="text-lg font-bold text-on-surface">Confirmation timed out</h2>
        <p className="text-sm text-on-surface-muted mt-2">
          Your payment may still be processing. Check your email for confirmation.
        </p>
        <Button variant="outline-primary" className="mt-6" onClick={() => navigate('/my-bookings')}>
          View My Bookings <span aria-hidden="true">→</span>
        </Button>
      </div>
    );
  }

  return (
    <div role="status" className="max-w-lg mx-auto px-4 pt-20 text-center">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6 motion-reduce:animate-none" aria-hidden="true" />
      <h2 className="text-lg font-bold text-on-surface">Confirming your booking…</h2>
      <p className="text-sm text-on-surface-muted mt-2">Please don't close this tab.</p>
    </div>
  );
}
