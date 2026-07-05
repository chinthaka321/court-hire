import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetBookings, adminCancelBooking } from '../../lib/api';
import type { AdminBooking } from '../../types';
import { formatDateTime, formatPrice } from '../../lib/utils';

function StateBadge({ state }: { state: string }) {
  const cfg: Record<string, string> = {
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-gray-100 text-gray-500',
    NoShow:    'bg-red-100 text-red-600',
  };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${cfg[state] ?? 'bg-gray-100 text-gray-500'}`}>
      {state === 'NoShow' ? 'No-show' : state}
    </span>
  );
}

export function AdminBookings() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<{ total: number; items: AdminBooking[] }>({
    queryKey: ['admin-bookings', page, date, search],
    queryFn: () => adminGetBookings({
      page,
      pageSize: 15,
      ...(date ? { date } : {}),
      ...(search ? { search } : {}),
    }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => adminCancelBooking(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-bookings'] }),
  });

  const bookings = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 15) || 1;

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Bookings</h1>
          <p className="text-sm text-on-surface-muted mt-0.5">View, search and manage all court bookings</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-surface-high p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-on-surface-muted">Date</label>
          <input
            type="date"
            className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            value={date}
            onChange={e => { setDate(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-on-surface-muted">Search player</label>
          <input
            type="text"
            placeholder="Name or email…"
            className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {(date || search) && (
          <button
            onClick={() => { setDate(''); setSearch(''); setPage(1); }}
            className="text-sm text-on-surface-muted hover:text-on-surface py-2 px-3 border border-outline-variant rounded-lg"
          >
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-sm text-on-surface-muted py-16">Loading…</div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-surface-high overflow-hidden mb-4">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_auto] bg-[#f2f4ef] px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-on-surface-muted gap-4">
              <span>Court &amp; Date</span>
              <span>Player</span>
              <span>Slot</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Action</span>
            </div>

            {bookings.length === 0 ? (
              <p className="text-center text-sm text-on-surface-muted py-12">No bookings found.</p>
            ) : (
              bookings.map(b => (
                <div
                  key={b.id}
                  className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_1.5fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 border-t border-[#f0f0f0] hover:bg-[#fbfcfa] transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{b.court.name}</p>
                    <p className="text-xs text-on-surface-muted mt-0.5">{b.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <p className="text-sm text-on-surface-muted truncate">{b.user.email}</p>
                  <div>
                    <p className="text-sm text-on-surface">{formatDateTime(b.slotStarts[0])}</p>
                    <p className="text-xs text-on-surface-muted mt-0.5">{b.slotStarts.length * 30} min</p>
                  </div>
                  <p className="text-sm font-semibold text-on-surface">{formatPrice(b.amountCharged)}</p>
                  <StateBadge state={b.state} />
                  <div>
                    {b.state === 'Completed' && (
                      <button
                        onClick={() => {
                          if (window.confirm('Cancel this booking and issue a full refund?')) {
                            cancelMutation.mutate(b.id);
                          }
                        }}
                        disabled={cancelMutation.isPending}
                        className="text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Cancel & Refund
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-on-surface-muted">
            <span>{total} total booking{total !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-outline-variant disabled:opacity-30 hover:bg-surface transition-colors"
              >
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-on-surface font-medium">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-outline-variant disabled:opacity-30 hover:bg-surface transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
