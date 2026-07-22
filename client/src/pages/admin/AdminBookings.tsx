import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetBookings, adminCancelBooking, getConfig, apiErrorMessage } from '../../lib/api';
import type { AdminBooking } from '../../types';
import { formatDateTime, formatPrice } from '../../lib/utils';
import { asWallClock, courtNow } from '../../lib/courtTime';
import { Button } from '../../components/ui/Button';
import { Input, Field } from '../../components/ui/Input';

function playerInitial(b: AdminBooking) {
  const source = b.user?.name || b.user?.email;
  return source ? source.trim().charAt(0).toUpperCase() : '?';
}

function StateBadge({ state }: { state: string }) {
  const cfg: Record<string, string> = {
    Completed: 'bg-green-100 text-green-700',
    Cancelled: 'bg-gray-100 text-gray-500',
    NoShow:    'bg-red-100 text-red-600',
  };
  const dotCfg: Record<string, string> = {
    Completed: 'bg-green-500',
    Cancelled: 'bg-gray-400',
    NoShow:    'bg-red-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg[state] ?? 'bg-gray-100 text-gray-500'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotCfg[state] ?? 'bg-gray-400'}`} />
      {state === 'NoShow' ? 'No-show' : state}
    </span>
  );
}

// Admin cancel ALWAYS refunds — flag when that's an override of the normal
// window so unintended refunds aren't issued silently (#22, ADR-0005).
function cancelConfirmMessage(b: AdminBooking, windowHours: number) {
  const outsideWindow = courtNow().getTime() > asWallClock(b.slotStarts[0]).getTime() - windowHours * 3_600_000;
  return outsideWindow
    ? `⚠ OVERRIDE: this booking is outside the ${windowHours}h cancellation window — the customer is NOT normally entitled to a refund. Cancel and refund anyway?`
    : 'Cancel this booking and issue a full refund?';
}

export function AdminBookings() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [date, setDate] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Debounce free-text search so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

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

  const { data: config } = useQuery({ queryKey: ['config'], queryFn: getConfig, staleTime: 300_000 });

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
        <div>
          <Field label="Date" htmlFor="filter-date">
            <Input
              id="filter-date"
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setPage(1); }}
            />
          </Field>
        </div>
        <div className="flex-1 min-w-45">
          <Field label="Search player" htmlFor="filter-search">
            <Input
              id="filter-search"
              type="text"
              placeholder="Name or email…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </Field>
        </div>
        {(date || searchInput) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setDate(''); setSearchInput(''); setSearch(''); setPage(1); }}
          >
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-surface-high overflow-hidden mb-4 animate-pulse">
          <div className="bg-[#f2f4ef] h-10" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-t border-[#f0f0f0]">
              <div className="h-4 bg-gray-100 rounded w-32" />
              <div className="h-4 bg-gray-100 rounded w-40" />
              <div className="h-4 bg-gray-100 rounded w-28 ml-auto" />
              <div className="h-4 bg-gray-100 rounded w-16" />
              <div className="h-6 bg-gray-100 rounded-full w-20" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-surface-high overflow-hidden mb-4">
            {bookings.length === 0 ? (
              <div className="text-center py-14">
                <p className="text-sm font-medium text-on-surface">No bookings found.</p>
                <p className="text-xs text-on-surface-muted mt-1">Try clearing the filters above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-215 border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#f2f4ef] text-[11px] font-bold uppercase tracking-wider text-on-surface-muted">
                      <th className="text-left px-5 py-3 font-bold">Court &amp; Date</th>
                      <th className="text-left px-5 py-3 font-bold">Player</th>
                      <th className="text-left px-5 py-3 font-bold">Slot</th>
                      <th className="text-right px-5 py-3 font-bold">Amount</th>
                      <th className="text-left px-5 py-3 font-bold">Status</th>
                      <th className="text-right px-5 py-3 font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {bookings.map(b => {
                      const playerName = b.user?.name || b.user?.email || 'Walk-in (no account)';
                      return (
                        <tr key={b.id} className="align-top hover:bg-[#fbfcfa] transition-colors">
                          <td className="px-5 py-4 whitespace-nowrap">
                            <p className="text-sm font-semibold text-on-surface">{b.court.name}</p>
                            <p className="text-xs text-on-surface-muted mt-0.5 font-mono">{b.id.slice(0, 8).toUpperCase()}</p>
                          </td>

                          <td className="px-5 py-4 min-w-0">
                            <div className="flex items-start gap-2.5 max-w-55">
                              <div className="w-7 h-7 rounded-full bg-primary-light text-primary-dark text-xs font-bold flex items-center justify-center shrink-0">
                                {playerInitial(b)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-on-surface truncate" title={playerName}>{playerName}</p>
                                {b.user?.name && b.user?.email && (
                                  <p className="text-xs text-on-surface-muted truncate">{b.user.email}</p>
                                )}
                                {b.notes && (
                                  <p className="text-xs text-primary-dark mt-0.5 italic truncate" title={b.notes}>
                                    &ldquo;{b.notes}&rdquo;
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <p className="text-sm text-on-surface">{formatDateTime(b.slotStarts[0])}</p>
                            <p className="text-xs text-on-surface-muted mt-0.5">{b.slotStarts.length * 30} min</p>
                          </td>

                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <span className="text-sm font-semibold text-on-surface">{formatPrice(b.amountCharged)}</span>
                          </td>

                          <td className="px-5 py-4 whitespace-nowrap">
                            <StateBadge state={b.state} />
                          </td>

                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            {b.state === 'Completed' && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  if (window.confirm(cancelConfirmMessage(b, config?.cancellationWindowHours ?? 24))) {
                                    cancelMutation.mutate(b.id);
                                  }
                                }}
                                disabled={cancelMutation.isPending && cancelMutation.variables === b.id}
                              >
                                {cancelMutation.isPending && cancelMutation.variables === b.id ? 'Cancelling…' : 'Cancel & Refund'}
                              </Button>
                            )}
                            {cancelMutation.isError && cancelMutation.variables === b.id && (
                              <p className="text-[11px] text-red-600 font-medium mt-1">
                                {apiErrorMessage(cancelMutation.error, 'Failed to cancel booking.')}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-on-surface-muted">
            <span>{total} total booking{total !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                ← Prev
              </Button>
              <span className="px-3 py-1.5 text-on-surface font-medium">
                {page} / {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next →
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
