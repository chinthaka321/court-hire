import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourts, adminGetBlackouts, adminCreateBlackout, adminDeleteBlackout, adminGetBlackoutConflicts, apiErrorMessage } from '../../lib/api';
import type { Court, Blackout } from '../../types';
import { formatDateTime } from '../../lib/utils';
import { asWallClock, courtNow } from '../../lib/courtTime';
import { Button } from '../../components/ui/Button';
import { Input, Select, Field } from '../../components/ui/Input';

interface BlackoutConflict {
  id: string;
  slotStarts: string[];
  user: { email: string; name: string | null };
}

export function AdminBlackouts() {
  const qc = useQueryClient();
  const [filterCourtId, setFilterCourtId] = useState('');
  const [form, setForm] = useState({ courtId: '', start: '', end: '', reason: '' });
  const [showForm, setShowForm] = useState(false);

  const { data: courts = [] } = useQuery<Court[]>({ queryKey: ['courts'], queryFn: getCourts });
  const { data: blackouts = [] } = useQuery<Blackout[]>({
    queryKey: ['blackouts', filterCourtId],
    queryFn: () => adminGetBlackouts(filterCourtId || undefined),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blackouts'] }),
  });

  const now = courtNow();
  function isUpcoming(start: string) {
    return asWallClock(start) > now;
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Blackouts</h1>
          <p className="text-sm text-on-surface-muted mt-0.5">Block court time for maintenance or events</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            + Add Blackout
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-surface-high p-5 mb-5">
          <h2 className="font-semibold text-on-surface mb-4">New Blackout</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Court" htmlFor="bl-court">
                <Select id="bl-court" value={form.courtId}
                  onChange={e => setForm(f => ({ ...f, courtId: e.target.value }))}>
                  <option value="">Select court…</option>
                  {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Start" htmlFor="bl-start">
              <Input id="bl-start" type="datetime-local" value={form.start}
                onChange={e => setForm(f => ({ ...f, start: e.target.value }))} />
            </Field>
            <Field label="End" htmlFor="bl-end">
              <Input id="bl-end" type="datetime-local" value={form.end}
                onChange={e => setForm(f => ({ ...f, end: e.target.value }))} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Reason (optional)" htmlFor="bl-reason">
                <Input
                  id="bl-reason"
                  placeholder="e.g. Net maintenance, Club event"
                  value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                />
              </Field>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => conflictCheckMutation.mutate()}
              disabled={conflictCheckMutation.isPending || createMutation.isPending || !form.courtId || !form.start || !form.end || form.end <= form.start}
            >
              {conflictCheckMutation.isPending ? 'Checking…' : createMutation.isPending ? 'Saving…' : 'Save Blackout'}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowForm(false); setForm({ courtId: '', start: '', end: '', reason: '' }); }}
            >
              Cancel
            </Button>
          </div>
          {(createMutation.isError || conflictCheckMutation.isError) && (
            <p className="text-xs font-semibold text-red-600 mt-3">
              {apiErrorMessage(createMutation.error ?? conflictCheckMutation.error, 'Failed to save blackout. Please try again.')}
            </p>
          )}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 max-w-xs">
        <Select
          aria-label="Filter by court"
          value={filterCourtId}
          onChange={e => setFilterCourtId(e.target.value)}
        >
          <option value="">All Courts</option>
          {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
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
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Remove this blackout?')) deleteMutation.mutate(bl.id);
                      }}
                      disabled={deleteMutation.isPending && deleteMutation.variables === bl.id}
                    >
                      {deleteMutation.isPending && deleteMutation.variables === bl.id ? 'Removing…' : 'Remove'}
                    </Button>
                    {deleteMutation.isError && deleteMutation.variables === bl.id && (
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
