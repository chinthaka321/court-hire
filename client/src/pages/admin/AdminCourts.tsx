import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetCourts, adminToggleCourt, createCourt, updateCourt, deleteCourt, apiErrorMessage } from '../../lib/api';
import type { Court } from '../../types';

interface CourtForm {
  name: string;
  open: string;
  close: string;
  slotLengthMinutes: number;
  dayNightBoundary: string;
}

const blank: CourtForm = { name: '', open: '07:00', close: '22:00', slotLengthMinutes: 30, dayNightBoundary: '18:00' };

const inputCls = 'w-full border border-gray-200 rounded-xl px-4.5 py-3 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all bg-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-on-surface-muted uppercase tracking-wider mb-2">{label}</label>
      {children}
    </div>
  );
}

export function AdminCourts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<CourtForm>(blank);
  const [showForm, setShowForm] = useState(false);

  const [toggleError, setToggleError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ['admin-courts'],
    queryFn: adminGetCourts,
    refetchInterval: 10_000,
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

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => adminToggleCourt(id, active),
    onMutate: ({ id }: { id: string; active: boolean }) => setTogglingId(id),
    onSuccess: () => {
      setToggleError(null);
      invalidateCourtDependents();
    },
    onError: (e: unknown) => {
      setToggleError(apiErrorMessage(e, 'Failed to update court status. Please try again.'));
    },
    onSettled: () => setTogglingId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCourt(id),
    onMutate: (id: string) => setDeletingId(id),
    onSuccess: () => {
      setDeleteError(null);
      invalidateCourtDependents();
    },
    onError: (e: unknown) => {
      setDeleteError(apiErrorMessage(e, 'Failed to delete court. Please try again.'));
    },
    onSettled: () => setDeletingId(null),
  });

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
          <button
            onClick={() => { setEditing(null); setForm(blank); setShowForm(true); }}
            className="text-sm font-bold text-white bg-primary px-5 py-2.5 rounded-xl hover:bg-primary-dark transition-all shadow-md shadow-primary/10 hover:shadow-lg active:scale-95 cursor-pointer"
          >
            + Add Court
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm shadow-gray-200/40 mb-8 animate-fadeIn">
          <h2 className="text-xl font-bold text-on-surface mb-6">{editing ? 'Edit Court Parameters' : 'Register New Court'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <Field label="Court Display Name">
                <input
                  className={inputCls}
                  placeholder="e.g. Court 3 (Clay)"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Opening Time">
              <input type="time" className={inputCls} value={form.open}
                onChange={e => setForm(f => ({ ...f, open: e.target.value }))} />
            </Field>
            <Field label="Closing Time">
              <input type="time" className={inputCls} value={form.close}
                onChange={e => setForm(f => ({ ...f, close: e.target.value }))} />
            </Field>
            <Field label="Slot length (base unit)">
              <div className={`${inputCls} text-on-surface-muted bg-gray-50 border-gray-100 cursor-not-allowed select-none font-medium`}>
                {form.slotLengthMinutes} minutes — fixed calendar block
              </div>
            </Field>
            <Field label="Day / Night boundary">
              <input type="time" className={inputCls} value={form.dayNightBoundary}
                onChange={e => setForm(f => ({ ...f, dayNightBoundary: e.target.value }))} />
              <p className="text-[11px] font-medium text-on-surface-muted mt-2 px-1">Sets the split time for Night rates</p>
            </Field>
          </div>

          {isTimeInvalid && (
            <p className="text-xs font-semibold text-red-600 mt-4 px-1">
              ⚠️ Closing time must be strictly after opening time.
            </p>
          )}

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || isFormInvalid}
              className="bg-primary text-white text-sm font-bold px-6 py-3 rounded-xl disabled:opacity-50 hover:bg-primary-dark transition-all cursor-pointer shadow-md shadow-primary/10 hover:shadow-lg"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Court'}
            </button>
            <button onClick={cancelForm}
              className="text-sm font-semibold text-on-surface-muted px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all cursor-pointer">
              Cancel
            </button>
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
                  setToggleError(null);
                  if (window.confirm(`Deactivate "${c.name}"? It will be hidden from customer bookings.`)) {
                    toggleMutation.mutate({ id: c.id, active: false });
                  }
                }}
                toggling={togglingId === c.id}
                onDelete={() => {
                  setDeleteError(null);
                  if (window.confirm(`Permanently delete "${c.name}"? This cannot be undone.`)) {
                    deleteMutation.mutate(c.id);
                  }
                }}
                deleting={deletingId === c.id}
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
                    onToggle={() => {
                      setToggleError(null);
                      toggleMutation.mutate({ id: c.id, active: true });
                    }}
                    toggling={togglingId === c.id}
                    onDelete={() => {
                      setDeleteError(null);
                      if (window.confirm(`Permanently delete "${c.name}"? This cannot be undone.`)) {
                        deleteMutation.mutate(c.id);
                      }
                    }}
                    deleting={deletingId === c.id}
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
        <button
          onClick={onEdit}
          className="text-xs font-bold text-primary border border-primary/20 rounded-xl px-4 py-2 hover:bg-primary-light transition-all cursor-pointer"
        >
          Edit
        </button>
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
          <button
            onClick={onToggle}
            disabled={toggling || deleting}
            className="flex-1 text-xs font-bold text-red-600 bg-red-50/50 border border-red-100/80 rounded-xl py-2.5 hover:bg-red-50 hover:text-red-700 transition-all disabled:opacity-50 cursor-pointer"
          >
            {toggling ? 'Deactivating…' : 'Deactivate Court'}
          </button>
        ) : (
          <button
            onClick={onToggle}
            disabled={toggling || deleting}
            className="flex-1 text-xs font-bold text-primary bg-primary-light border border-primary/10 rounded-xl py-2.5 hover:bg-primary/10 transition-all disabled:opacity-50 cursor-pointer"
          >
            {toggling ? 'Reactivating…' : 'Reactivate Court'}
          </button>
        )}
        <button
          onClick={onDelete}
          disabled={toggling || deleting}
          title="Delete permanently (only possible if the court has no bookings)"
          className="text-xs font-bold text-white bg-red-600 rounded-xl px-4 py-2.5 hover:bg-red-700 transition-all disabled:opacity-50 cursor-pointer"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
