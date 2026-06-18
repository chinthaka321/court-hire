import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetBookings, adminCancelBooking } from '../../lib/api';
import { Booking } from '../../types';
import { formatDateTime, formatPrice } from '../../lib/utils';

export function AdminBookings() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [date, setDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings', page, date],
    queryFn: () => adminGetBookings({ page, pageSize: 20, ...(date ? { date } : {}) }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => adminCancelBooking(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bookings'] }),
  });

  const bookings: Booking[] = data?.items ?? [];
  const total: number = data?.total ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-[#191c19] mb-4">All Bookings</h1>

      <div className="flex gap-2 mb-4">
        <input type="date" className="border border-[#bfc9bf] rounded-lg px-3 py-2 text-sm"
          value={date} onChange={e => { setDate(e.target.value); setPage(1); }} />
        {date && <button onClick={() => setDate('')} className="text-sm text-[#404942]">Clear</button>}
      </div>

      {isLoading ? (
        <p className="text-center text-sm text-[#404942] py-8">Loading…</p>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-[#e6e9e4] overflow-hidden mb-4">
            <div className="grid grid-cols-5 bg-[#f2f4ef] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#404942]">
              <span className="col-span-2">Slot</span>
              <span>User</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            {bookings.length === 0 ? (
              <p className="text-center text-sm text-[#404942] py-8">No bookings.</p>
            ) : bookings.map(b => (
              <div key={b.id}
                className="grid grid-cols-5 items-center px-4 border-t border-[#f0f0f0]"
                style={{ minHeight: '56px' }}>
                <div className="col-span-2">
                  <p className="text-sm font-medium text-[#191c19]">{(b as any).court?.name}</p>
                  <p className="text-xs text-[#404942]">{formatDateTime(b.slotStarts[0])}</p>
                </div>
                <p className="text-xs text-[#404942] truncate">{(b as any).user?.email ?? '—'}</p>
                <p className="text-sm font-medium text-[#191c19]">{formatPrice(b.amountCharged)}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${
                    b.state === 'Completed' ? 'text-[#006e2d]' :
                    b.state === 'Cancelled' ? 'text-gray-400' : 'text-red-600'
                  }`}>{b.state}</span>
                  {b.state === 'Completed' && (
                    <button
                      onClick={() => window.confirm('Cancel & refund this booking?') && cancelMutation.mutate(b.id)}
                      className="text-xs text-red-600 font-medium ml-1"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm text-[#404942]">
            <span>{total} total</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded border border-[#bfc9bf] disabled:opacity-40">←</button>
              <span className="px-3 py-1">Page {page}</span>
              <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded border border-[#bfc9bf] disabled:opacity-40">→</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
