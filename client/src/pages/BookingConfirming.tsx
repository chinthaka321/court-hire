import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { pollBookingByHoldGroup } from '../lib/api';

export function BookingConfirming() {
  const [params] = useSearchParams();
  const holdGroupId = params.get('holdGroupId');
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!holdGroupId) { setError(true); return; }

    const interval = setInterval(async () => {
      try {
        const result = await pollBookingByHoldGroup(holdGroupId);
        if (result.status === 'confirmed') {
          clearInterval(interval);
          navigate(`/booking/confirmed/${result.bookingId}`, { replace: true });
        }
      } catch {
        // continue polling
      }

      setAttempts(a => {
        if (a >= 15) { // 30s max
          clearInterval(interval);
          setError(true);
        }
        return a + 1;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [holdId, navigate]);

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-lg font-bold text-[#191c19]">Confirmation timed out</h2>
        <p className="text-sm text-[#404942] mt-2">
          Your payment may still be processing. Check your email for confirmation.
        </p>
        <button
          onClick={() => navigate('/my-bookings')}
          className="mt-6 text-[#1b5e3b] font-medium text-sm"
        >
          View My Bookings →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-20 text-center">
      <div className="w-12 h-12 border-4 border-[#1b5e3b] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
      <h2 className="text-lg font-bold text-[#191c19]">Confirming your booking…</h2>
      <p className="text-sm text-[#404942] mt-2">Please don't close this tab.</p>
    </div>
  );
}
