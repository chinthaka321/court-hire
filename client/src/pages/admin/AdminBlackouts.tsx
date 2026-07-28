import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCourts,
  adminGetBlackouts,
  adminCreateBlackout,
  adminDeleteBlackout,
  adminGetBlackoutConflicts,
  apiErrorMessage,
} from '../../lib/api';
import type { Court, Blackout } from '../../types';
import { formatDateTime } from '../../lib/utils';
import { asWallClock, courtNow } from '../../lib/courtTime';
import { Button } from '../../components/ui/Button';
import { Input, Select, Field } from '../../components/ui/Input';
import { useToast } from '../../components/ui/ToastContext';
import { Plus } from 'lucide-react';

interface BlackoutConflict {
  id: string;
  slotStarts: string[];
  user: { email: string; name: string | null };
}

export function AdminBlackouts() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [filterCourtId, setFilterCourtId] = useState('');
  const [form, setForm] = useState({ courtId: '', start: '', end: '', reason: '' });
  const [showForm, setShowForm] = useState(false);

  const { data: courts = [] } = useQuery<Court[]>({ queryKey: ['courts'], queryFn: getCourts });
  const { data: blackouts = [] } = useQuery<Blackout[]>({
    queryKey: ['blackouts', filterCourtId],
    queryFn: () => adminGetBlackouts(filterCourtId || undefined),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminCreateBlackout({
        courtId: form.courtId,
        start: `${form.start}:00Z`,
        end: `${form.end}:00Z`,
        reason: form.reason || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blackouts'] });
      showToast('Blackout window scheduled successfully!', 'success');
      setShowForm(false);
      setForm({ courtId: '', start: '', end: '', reason: '' });
    },
    onError: (e: unknown) => {
      showToast(apiErrorMessage(e, 'Failed to schedule blackout.'), 'error');
    },
  });

  const conflictCheckMutation = useMutation({
    mutationFn: () =>
      adminGetBlackoutConflicts(
        form.courtId,
        `${form.start}:00Z`,
        `${form.end}:00Z`
      ) as Promise<BlackoutConflict[]>,
    onSuccess: (conflicts) => {
      if (conflicts.length === 0) {
        createMutation.mutate();
        return;
      }
      const names = conflicts.map((c) => c.user.name || c.user.email).join(', ');
      const proceed = window.confirm(
        `Warning: ${conflicts.length} existing booking(s) overlap with this blackout window (${names}). ` +
          `They will NOT be cancelled automatically. Proceed anyway?`
      );
      if (proceed) createMutation.mutate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteBlackout(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blackouts'] });
      showToast('Blackout window removed.', 'info');
    },
    onError: (e: unknown) => {
      showToast(apiErrorMessage(e, 'Failed to delete blackout.'), 'error');
    },
  });

  const now = courtNow();
  function isUpcoming(start: string) {
    return asWallClock(start) > now;
  }

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Blackout Manager</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Schedule maintenance blocks or facility holds that pause public court availability.
          </p>
        </div>
        {!showForm && (
          <Button
            className="self-start sm:self-auto shrink-0 bg-emerald-600 hover:bg-emerald-700 font-extrabold shadow-md shadow-emerald-600/20"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Schedule Blackout
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xl space-y-6">
          <h2 className="text-xl font-black text-slate-900">New Blackout Schedule</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <Field label="Target Court" htmlFor="bl-court">
                <Select
                  id="bl-court"
                  value={form.courtId}
                  onChange={(e) => setForm((f) => ({ ...f, courtId: e.target.value }))}
                >
                  <option value="">Select court...</option>
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Start Date & Time" htmlFor="bl-start">
              <Input
                id="bl-start"
                type="datetime-local"
                value={form.start}
                onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
              />
            </Field>
            <Field label="End Date & Time" htmlFor="bl-end">
              <Input
                id="bl-end"
                type="datetime-local"
                value={form.end}
                onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Reason / Notes (optional)" htmlFor="bl-reason">
                <Input
                  id="bl-reason"
                  placeholder="e.g. Net repair, Junior Tournament"
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </Field>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button
              onClick={() => conflictCheckMutation.mutate()}
              disabled={
                conflictCheckMutation.isPending ||
                createMutation.isPending ||
                !form.courtId ||
                !form.start ||
                !form.end ||
                form.end <= form.start
              }
              className="bg-emerald-600 hover:bg-emerald-700 font-extrabold"
            >
              {conflictCheckMutation.isPending
                ? 'Checking Conflicts...'
                : createMutation.isPending
                ? 'Saving...'
                : 'Confirm Blackout'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setForm({ courtId: '', start: '', end: '', reason: '' });
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-xs">
        <Select value={filterCourtId} onChange={(e) => setFilterCourtId(e.target.value)}>
          <option value="">All Courts</option>
          {courts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {blackouts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-xl">
          <p className="text-lg font-bold text-slate-800">No Blackouts Scheduled</p>
          <p className="text-sm text-slate-400 mt-1">Block off court availability for events or maintenance above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {blackouts.map((bl) => {
            const upcoming = isUpcoming(bl.start);
            return (
              <div
                key={bl.id}
                className={`bg-white rounded-3xl border p-6 flex items-center justify-between gap-4 shadow-xl shadow-slate-200/40 transition-all ${
                  upcoming ? 'border-slate-200' : 'border-slate-100 bg-slate-50/60 opacity-80'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-900 text-base">
                      {courts.find((c) => c.id === bl.courtId)?.name ?? 'Court'}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                        upcoming
                          ? 'text-amber-800 bg-amber-100 border-amber-200'
                          : 'text-slate-500 bg-slate-200 border-slate-300'
                      }`}
                    >
                      {upcoming ? 'Active / Upcoming' : 'Past Window'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-600 mt-2">
                    {formatDateTime(bl.start)} → {formatDateTime(bl.end)}
                  </p>
                  {bl.reason && <p className="text-xs text-slate-400 font-medium italic mt-1">&ldquo;{bl.reason}&rdquo;</p>}
                </div>
                {upcoming && (
                  <Button
                    variant="danger"
                    size="sm"
                    className="rounded-xl font-extrabold shrink-0"
                    onClick={() => {
                      if (window.confirm('Remove this blackout window?')) deleteMutation.mutate(bl.id);
                    }}
                    disabled={deleteMutation.isPending && deleteMutation.variables === bl.id}
                  >
                    {deleteMutation.isPending && deleteMutation.variables === bl.id ? 'Removing...' : 'Remove Blackout'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
