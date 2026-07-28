import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { pollBookingByHoldGroup } from '../lib/api';
import { Button } from '../components/ui/Button';
import { IconBadge } from '../components/ui/IconBadge';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';

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
      if (attempts >= 15) {
        clearInterval(interval);
        setPollError('timeout');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [holdGroupId, navigate]);

  if (error === 'expired') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-6">
        <IconBadge icon={AlertTriangle} tone="amber" />
        <h2 className="text-2xl font-black text-slate-900">Payment Window Expired</h2>
        <p className="text-sm font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
          Your hold on the court slot expired before checkout completed, so the reservation was released.
          If any card charge occurred, Stripe will process an automatic refund.
        </p>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 font-extrabold rounded-2xl px-6 py-3 shadow-lg shadow-emerald-600/30"
          onClick={() => navigate('/')}
        >
          Return to Booking Calendar ›
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-6">
        <IconBadge icon={Clock} tone="amber" />
        <h2 className="text-2xl font-black text-slate-900">Confirmation Taking Longer Than Expected</h2>
        <p className="text-sm font-semibold text-slate-500 max-w-md mx-auto leading-relaxed">
          Your payment might still be settling via Stripe webhook. Check your email or your My Bookings list.
        </p>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 font-extrabold rounded-2xl px-6 py-3 shadow-lg shadow-emerald-600/30"
          onClick={() => navigate('/my-bookings')}
        >
          View My Bookings ›
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-6">
      <div className="relative w-16 h-16 mx-auto">
        <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <RefreshCw className="w-6 h-6 text-emerald-600 absolute inset-0 m-auto animate-pulse" />
      </div>
      <h2 className="text-2xl font-black text-slate-900">Confirming Your Booking...</h2>
      <p className="text-sm font-semibold text-slate-500">
        Verifying payment settlement with Stripe. Please do not close or refresh this page.
      </p>
    </div>
  );
}
