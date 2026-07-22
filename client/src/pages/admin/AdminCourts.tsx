import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetCourts, adminToggleCourt, createCourt, updateCourt, deleteCourt, apiErrorMessage } from '../../lib/api';
import type { Court } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input, Field } from '../../components/ui/Input';

interface CourtForm {
  name: string;
  open: string;
  close: string;
  slotLengthMinutes: number;
  dayNightBoundary: string;
}

const blank: CourtForm = { name: '', open: '07:00', close: '22:00', slotLengthMinutes: 30, dayNightBoundary: '18:00' };

function WarningIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l6.28 11.19c.75 1.334-.213 2.98-1.744 2.98H3.72c-1.53 0-2.493-1.646-1.744-2.98l6.28-11.19zM11 14a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.5a.75.75 0 00-1.5 0v3a.75.75 0 001.5 0v-3z" clipRule="evenodd" />
    </svg>
  );
}

export function AdminCourts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<CourtForm>(blank);
  const [showForm, setShowForm] = useState(false);

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ['admin-courts'],
    queryFn: adminGetCourts,
  });

  function invalidateCourtDependents() {
    qc.invalidateQueries({ queryKey: ['admin-courts'] });
    qc.invalidateQueries({ queryKey: ['courts'] });
    qc.invalidateQueries({ queryKey: ['availability'] });
    qc.invalidateQueries({ queryKey: ['admin-pricing'] });
    qc.invalidateQueries({ queryKey: ['blackouts'] });
  }

  const saveMutation = useMutation({
    mutationFn: () => editing ? updateCourt(editing, form) : createCourt(form),
    onSuccess: () => {
      invalidateCourtDependents();
      setShowForm(false);
      setEditing(null);
      setForm(blank);
    },
  });

  // Single shared mutation per action; which row is "in flight" is read back off
  // `mutation.variables` rather than tracked in separate state (React Query already
  // resets isPending/isError when a new mutate() call starts).
  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => adminToggleCourt(id, active),
    onSuccess: invalidateCourtDependents,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCourt(id),
    onSuccess: invalidateCourtDependents,
  });

  const toggleError = toggleMutation.isError
    ? apiErrorMessage(toggleMutation.error, 'Failed to update court status. Please try again.')
    : null;
  const deleteError = deleteMutation.isError
    ? apiErrorMessage(deleteMutation.error, 'Failed to delete court. Please try again.')
    : null;

  function editCourt(c: Court) {
    setEditing(c.id);
    setForm({
      name: c.name,
      open: c.openingHours.open.slice(0, 5),
      close: c.openingHours.close.slice(0, 5),
      slotLengthMinutes: c.slotLengthMinutes,
      dayNightBoundary: c.dayNightBoundary.slice(0, 5),
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
    setForm(blank);
  }

  const activeCourts = courts.filter(c => c.active);
  const inactiveCourts = courts.filter(c => !c.active);

  const isTimeInvalid = form.close !== "00:00" && form.close <= form.open;
  const isFormInvalid = !form.name.trim() || isTimeInvalid;

  return (
    <div className="px-4 sm:px-6 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Courts</h1>
          <p className="text-sm text-on-surface-muted mt-1">Configure operating hours, slot base unit, and pricing bands</p>
        </div>
        {!showForm && (
          <Button onClick={() => { setEditing(null); setForm(blank); setShowForm(true); }}>
            + Add Court
          </Button>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm shadow-gray-200/40 mb-8 animate-fadeIn">
          <h2 className="text-xl font-bold text-on-surface mb-6">{editing ? 'Edit Court Parameters' : 'Register New Court'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <Field label="Court Display Name" htmlFor="court-name">
                <Input
                  id="court-name"
                  placeholder="e.g. Court 3 (Clay)"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Opening Time" htmlFor="court-open">
              <Input id="court-open" type="time" value={form.open}
                onChange={e => setForm(f => ({ ...f, open: e.target.value }))} />
            </Field>
            <Field label="Closing Time" htmlFor="court-close">
              <Input id="court-close" type="time" value={form.close}
                onChange={e => setForm(f => ({ ...f, close: e.target.value }))} />
            </Field>
            <Field label="Slot length (base unit)" htmlFor="court-slot-length">
              <div
                id="court-slot-length"
                className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-on-surface-muted bg-gray-50 cursor-not-allowed select-none font-medium"
              >
                {form.slotLengthMinutes} minutes — fixed calendar block
              </div>
            </Field>
            <Field label="Day / Night boundary" htmlFor="court-boundary" hint="Sets the split time for Night rates">
              <Input id="court-boundary" type="time" value={form.dayNightBoundary}
                onChange={e => setForm(f => ({ ...f, dayNightBoundary: e.target.value }))} />
            </Field>
          </div>

          {isTimeInvalid && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600 mt-4 px-1">
              <WarningIcon />
              Closing time must be strictly after opening time.
            </p>
          )}

          <div className="flex gap-3 mt-8">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || isFormInvalid}>
              {saveMutation.isPending ? 'Saving…' : 'Save Court'}
            </Button>
            <Button variant="outline" onClick={cancelForm}>
              Cancel
            </Button>
          </div>
          {saveMutation.isError && (
            <p className="text-xs font-semibold text-red-600 mt-4 px-1">
              {apiErrorMessage(saveMutation.error, 'Failed to save court. Please verify your permissions and try again.')}
            </p>
          )}
        </div>
      )}

      {(toggleError || deleteError) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 mb-6 text-sm font-semibold text-red-700">
          {toggleError ?? deleteError}
        </div>
      )}

      {/* Active courts */}
      {courts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-base font-bold text-on-surface-muted">No Courts Added Yet</p>
          <p className="text-sm text-gray-400 mt-1">Get started by creating your first tennis court above.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {activeCourts.map(c => (
              <CourtCard
                key={c.id}
                court={c}
                onEdit={() => editCourt(c)}
                onToggle={() => {
                  if (window.confirm(`Deactivate "${c.name}"? It will be hidden from customer bookings.`)) {
                    toggleMutation.mutate({ id: c.id, active: false });
                  }
                }}
                toggling={toggleMutation.isPending && toggleMutation.variables?.id === c.id}
                onDelete={() => {
                  if (window.confirm(`Permanently delete "${c.name}"? This cannot be undone.`)) {
                    deleteMutation.mutate(c.id);
                  }
                }}
                deleting={deleteMutation.isPending && deleteMutation.variables === c.id}
              />
            ))}
          </div>

          {/* Inactive courts */}
          {inactiveCourts.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">
                Inactive Courts
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {inactiveCourts.map(c => (
                  <CourtCard
                    key={c.id}
                    court={c}
                    onEdit={() => editCourt(c)}
                    onToggle={() => toggleMutation.mutate({ id: c.id, active: true })}
                    toggling={toggleMutation.isPending && toggleMutation.variables?.id === c.id}
                    onDelete={() => {
                      if (window.confirm(`Permanently delete "${c.name}"? This cannot be undone.`)) {
                        deleteMutation.mutate(c.id);
                      }
                    }}
                    deleting={deleteMutation.isPending && deleteMutation.variables === c.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CourtCard({
  court, onEdit, onToggle, toggling, onDelete, deleting,
}: {
  court: Court;
  onEdit: () => void;
  onToggle: () => void;
  toggling: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border p-6 transition-all duration-300 shadow-sm shadow-gray-200/20 ${
      court.active
        ? 'border-gray-100 hover:border-primary/30 hover:shadow-md'
        : 'border-gray-100 opacity-70'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-bold text-on-surface text-lg tracking-tight">{court.name}</p>
          {court.active ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full mt-1.5 border border-emerald-100/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full mt-1.5 border border-gray-200/50">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              Inactive
            </span>
          )}
        </div>
        <Button variant="outline-primary" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>

      <div className="space-y-2.5 text-sm mb-6 border-t border-gray-50 pt-4">
        <div className="flex justify-between">
          <span className="text-on-surface-muted font-medium">Opening Hours</span>
          <span className="font-bold text-on-surface">
            {court.openingHours.open.slice(0, 5)} – {court.openingHours.close.slice(0, 5)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-muted font-medium">Day/Night split</span>
          <span className="font-bold text-on-surface">{court.dayNightBoundary.slice(0, 5)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        {court.active ? (
          <Button variant="danger" size="sm" className="flex-1" onClick={onToggle} disabled={toggling || deleting}>
            {toggling ? 'Deactivating…' : 'Deactivate Court'}
          </Button>
        ) : (
          <Button variant="subtle-primary" size="sm" className="flex-1" onClick={onToggle} disabled={toggling || deleting}>
            {toggling ? 'Reactivating…' : 'Reactivate Court'}
          </Button>
        )}
        <Button
          variant="danger-solid"
          size="sm"
          onClick={onDelete}
          disabled={toggling || deleting}
          title="Delete permanently (only possible if the court has no bookings)"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </div>
  );
}
