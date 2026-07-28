import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetBookings, adminCancelBooking, getConfig, apiErrorMessage } from '../../lib/api';
import type { AdminBooking } from '../../types';
import { formatDateTime, formatPrice } from '../../lib/utils';
import { asWallClock, courtNow } from '../../lib/courtTime';
import { Button } from '../../components/ui/Button';
import { Input, Field } from '../../components/ui/Input';
import { useToast } from '../../components/ui/ToastContext';


function isWalkIn(b: AdminBooking): boolean {
  return !!(b.payerName || b.payerEmail);
}

function playerDisplayName(b: AdminBooking): string {
  if (isWalkIn(b)) return b.payerName || b.payerEmail || 'Walk-in Customer';
  return b.user?.name || b.user?.email || 'Walk-in (no account)';
}

function playerSecondaryLine(b: AdminBooking): string | null {
  if (isWalkIn(b)) {
    return b.payerName && b.payerEmail ? b.payerEmail : null;
  }
  return b.user?.name && b.user?.email ? b.user.email : null;
}

function playerInitial(b: AdminBooking) {
  const source = playerDisplayName(b);
  return source ? source.trim().charAt(0).toUpperCase() : '?';
}

function StateBadge({ state }: { state: string }) {
  const cfg: Record<string, string> = {
    Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
    NoShow: 'bg-rose-100 text-rose-800 border-rose-200',
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${cfg[state] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {state === 'NoShow' ? 'No-show' : state}
    </span>
  );
}

function cancelConfirmMessage(b: AdminBooking, windowHours: number) {
  const outsideWindow = courtNow().getTime() > asWallClock(b.slotStarts[0]).getTime() - windowHours * 3_600_000;
  return outsideWindow
    ? `⚠ OVERRIDE: This booking is outside the ${windowHours}h cancellation window — the customer is NOT normally entitled to a refund. Cancel and refund anyway?`
    : 'Cancel this booking and issue a full Stripe refund?';
}

export function AdminBookings() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [page, setPage] = useState(1);
  const [date, setDate] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery<{ total: number; items: AdminBooking[] }>({
    queryKey: ['admin-bookings', page, date, search],
    queryFn: () =>
      adminGetBookings({
        page,
        pageSize: 15,
        ...(date ? { date } : {}),
        ...(search ? { search } : {}),
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => adminCancelBooking(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
      showToast('Booking cancelled & full refund issued.', 'success');
    },
    onError: (e: unknown) => {
      showToast(apiErrorMessage(e, 'Failed to cancel booking.'), 'error');
    },
  });

  const { data: config } = useQuery({ queryKey: ['config'], queryFn: getConfig, staleTime: 300_000 });

  const bookings = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 15) || 1;

  return (
    <div className="px-4 sm:px-8 py-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bookings Directory</h1>
        <p className="text-sm font-semibold text-slate-500 mt-1">
          Search, filter, inspect, and manage refunds for all reservations.
        </p>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xl shadow-slate-200/40 flex flex-wrap gap-4 items-end">
        <div>
          <Field label="Filter Date" htmlFor="filter-date">
            <Input
              id="filter-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
            />
          </Field>
        </div>
        <div className="flex-1 min-w-56">
          <Field label="Search Customer" htmlFor="filter-search">
            <Input
              id="filter-search"
              type="text"
              placeholder="Search by name, email, or notes..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </Field>
        </div>
        {(date || searchInput) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDate('');
              setSearchInput('');
              setSearch('');
              setPage(1);
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Bookings table */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-pulse">
          <div className="h-12 bg-slate-100" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-t border-slate-100">
              <div className="h-4 bg-slate-200 rounded w-32" />
              <div className="h-4 bg-slate-200 rounded w-44" />
              <div className="h-4 bg-slate-200 rounded w-28 ml-auto" />
              <div className="h-6 bg-slate-200 rounded-full w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {bookings.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-semibold">
              <p className="text-lg font-bold text-slate-700">No Reservations Found</p>
              <p className="text-sm text-slate-400 mt-1">Try clearing or broadening your search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-215 border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    <th className="text-left px-6 py-4 font-black">Court & Reference</th>
                    <th className="text-left px-6 py-4 font-black">Customer Details</th>
                    <th className="text-left px-6 py-4 font-black">Slot Time</th>
                    <th className="text-right px-6 py-4 font-black">Amount</th>
                    <th className="text-left px-6 py-4 font-black">Status</th>
                    <th className="text-right px-6 py-4 font-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((b) => {
                    const playerName = playerDisplayName(b);
                    const secondaryLine = playerSecondaryLine(b);
                    const walkIn = isWalkIn(b);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-black text-slate-900">{b.court.name}</p>
                          <p className="text-[11px] font-mono font-bold text-slate-400 mt-0.5">
                            ID: #{b.id.slice(0, 8).toUpperCase()}
                          </p>
                        </td>

                        <td className="px-6 py-4 min-w-0">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-2xl text-xs font-black flex items-center justify-center shrink-0 shadow-xs ${
                                walkIn ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                              }`}
                            >
                              {playerInitial(b)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900 truncate" title={playerName}>
                                  {playerName}
                                </p>
                                {walkIn && (
                                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                                    Walk-in
                                  </span>
                                )}
                              </div>
                              {secondaryLine && (
                                <p className="text-xs text-slate-400 truncate font-medium">{secondaryLine}</p>
                              )}
                              {b.notes && (
                                <p className="text-xs text-emerald-700 italic mt-0.5 truncate" title={b.notes}>
                                  &ldquo;{b.notes}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-bold text-slate-900">{formatDateTime(b.slotStarts[0])}</p>
                          <p className="text-xs font-semibold text-slate-400 mt-0.5">
                            {b.slotStarts.length * 30} min session
                          </p>
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <span className="text-sm font-black text-slate-900">{formatPrice(b.amountCharged)}</span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <StateBadge state={b.state} />
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {b.state === 'Completed' && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    cancelConfirmMessage(b, config?.cancellationWindowHours ?? 24)
                                  )
                                ) {
                                  cancelMutation.mutate(b.id);
                                }
                              }}
                              disabled={cancelMutation.isPending && cancelMutation.variables === b.id}
                            >
                              {cancelMutation.isPending && cancelMutation.variables === b.id
                                ? 'Cancelling...'
                                : 'Cancel & Refund'}
                            </Button>
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
      )}

      {/* Pagination control */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
        <span>Showing {total} total records</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            ← Previous
          </Button>
          <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </Button>
        </div>
      </div>
    </div>
  );
}
