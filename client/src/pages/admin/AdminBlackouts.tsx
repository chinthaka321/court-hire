import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourts, adminGetBlackouts, adminCreateBlackout, adminDeleteBlackout, adminGetBlackoutConflicts, apiErrorMessage } from '../../lib/api';
import type { Court, Blackout } from '../../types';
import { formatDateTime } from '../../lib/utils';

interface BlackoutConflict {
  id: string;
  slotStarts: string[];
  user: { email: string; name: string | null };
}

const inputCls = 'w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white';

export function AdminBlackouts() {
  const qc = useQueryClient();
  const [filterCourtId, setFilterCourtId] = useState('');
  const [form, setForm] = useState({ courtId: '', start: '', end: '', reason: '' });
  const [showForm, setShowForm] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);

  const { data: courts = [] } = useQuery<Court[]>({ queryKey: ['courts'], queryFn: getCourts, refetchInterval: 15_000 });
  const { data: blackouts = [] } = useQuery<Blackout[]>({
    queryKey: ['blackouts', filterCourtId],
    queryFn: () => adminGetBlackouts(filterCourtId || undefined),
    refetchInterval: 10_000,
  });

  const createMutation = useMutation({
    // Times are the court's wall clock — send them labelled UTC so the server
    // stores them as-is, matching how slot times are stored.
    mutationFn: () => adminCreateBlackout({
      courtId: form.courtId,
      start: `${form.start}:00Z`,
      end: `${form.end}:00Z`,
      reason: form.reason || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blackouts'] });
      setShowForm(false);
      setForm({ courtId: '', start: '', end: '', reason: '' });
    },
  });

  // ADR-0012: blackouts can overlap existing paid bookings — warn the admin with the
  // affected players before saving, but don't block it (business call, not a hard rule).
  const conflictCheckMutation = useMutation({
    mutationFn: () => adminGetBlackoutConflicts(form.courtId, `${form.start}:00Z`, `${form.end}:00Z`) as Promise<BlackoutConflict[]>,
    onSuccess: (conflicts) => {
      if (conflicts.length === 0) {
        createMutation.mutate();
        return;
      }
      const names = conflicts.map(c => c.user.name || c.user.email).join(', ');
      const proceed = window.confirm(
        `Warning: ${conflicts.length} existing booking(s) fall inside this blackout window (${names}). ` +
        `They will NOT be cancelled or refunded automatically — the slot will just show as blacked out. Save anyway?`
      );
      if (proceed) createMutation.mutate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteBlackout(id),
    onMutate: (id: string) => { setDeleteId(id); setDeleteErrorId(null); },
    onSuccess: () => {
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ['blackouts'] });
    },
    onError: (_e, id) => { setDeleteId(null); setDeleteErrorId(id); },
  });

  function isUpcoming(start: string) {
    return new Date(start) > new Date();
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Blackouts</h1>
          <p className="text-sm text-on-surface-muted mt-0.5">Block court time for maintenance or events</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-semibold text-white bg-primary px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            + Add Blackout
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-surface-high p-5 mb-5">
          <h2 className="font-semibold text-on-surface mb-4">New Blackout</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-on-surface-muted mb-1">Court</label>
              <select className={inputCls} value={form.courtId}
                onChange={e => setForm(f => ({ ...f, courtId: e.target.value }))}>
                <option value="">Select court…</option>
                {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-muted mb-1">Start</label>
              <input type="datetime-local" className={inputCls} value={form.start}
                onChange={e => setForm(f => ({ ...f, start: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-on-surface-muted mb-1">End</label>
              <input type="datetime-local" className={inputCls} value={form.end}
                onChange={e => setForm(f => ({ ...f, end: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-on-surface-muted mb-1">Reason (optional)</label>
              <input
                className={inputCls}
                placeholder="e.g. Net maintenance, Club event"
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => conflictCheckMutation.mutate()}
              disabled={conflictCheckMutation.isPending || createMutation.isPending || !form.courtId || !form.start || !form.end || form.end <= form.start}
              className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50 hover:bg-primary-dark transition-colors"
            >
              {conflictCheckMutation.isPending ? 'Checking…' : createMutation.isPending ? 'Saving…' : 'Save Blackout'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ courtId: '', start: '', end: '', reason: '' }); }}
              className="text-sm text-on-surface-muted px-5 py-2 rounded-lg border border-outline-variant hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
          {(createMutation.isError || conflictCheckMutation.isError) && (
            <p className="text-xs font-semibold text-red-600 mt-3">
              {apiErrorMessage(createMutation.error ?? conflictCheckMutation.error, 'Failed to save blackout. Please try again.')}
            </p>
          )}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <select
          className="border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
          value={filterCourtId}
          onChange={e => setFilterCourtId(e.target.value)}
        >
          <option value="">All Courts</option>
          {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Blackout list */}
      {blackouts.length === 0 ? (
        <div className="text-center py-16 text-sm text-on-surface-muted">No blackouts scheduled.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {blackouts.map(bl => {
            const upcoming = isUpcoming(bl.start);
            return (
              <div
                key={bl.id}
                className={`bg-white rounded-xl border p-4 flex items-center justify-between gap-4 ${
                  upcoming ? 'border-surface-high' : 'border-[#f0f0f0] opacity-60'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-on-surface">
                      {courts.find(c => c.id === bl.courtId)?.name ?? 'Court'}
                    </p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      upcoming ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {upcoming ? 'Upcoming' : 'Past'}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-muted mt-1">
                    {formatDateTime(bl.start)} → {formatDateTime(bl.end)}
                  </p>
                  {bl.reason && (
                    <p className="text-xs text-on-surface-muted mt-0.5 italic">{bl.reason}</p>
                  )}
                </div>
                {upcoming && (
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <button
                      onClick={() => {
                        if (window.confirm('Remove this blackout?')) deleteMutation.mutate(bl.id);
                      }}
                      disabled={deleteMutation.isPending && deleteId === bl.id}
                      className="text-xs font-medium text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {deleteMutation.isPending && deleteId === bl.id ? 'Removing…' : 'Remove'}
                    </button>
                    {deleteErrorId === bl.id && (
                      <span className="text-[11px] text-red-600 font-medium">{apiErrorMessage(deleteMutation.error, 'Failed to remove.')}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
