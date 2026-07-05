import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetCourts, adminToggleCourt, createCourt, updateCourt } from '../../lib/api';
import type { Court } from '../../types';

interface CourtForm {
  name: string;
  open: string;
  close: string;
  slotLengthMinutes: number;
  dayNightBoundary: string;
}

const blank: CourtForm = { name: '', open: '07:00', close: '22:00', slotLengthMinutes: 30, dayNightBoundary: '18:00' };

const inputCls = 'w-full border border-outline-variant rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-on-surface-muted mb-1">{label}</label>
      {children}
    </div>
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

  const saveMutation = useMutation({
    mutationFn: () => editing ? updateCourt(editing, form) : createCourt(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courts'] });
      qc.invalidateQueries({ queryKey: ['courts'] });
      setShowForm(false);
      setEditing(null);
      setForm(blank);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => adminToggleCourt(id, active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-courts'] });
      qc.invalidateQueries({ queryKey: ['courts'] });
    },
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

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Courts</h1>
          <p className="text-sm text-on-surface-muted mt-0.5">Configure hours, slot length, and pricing boundaries</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditing(null); setForm(blank); setShowForm(true); }}
            className="text-sm font-semibold text-white bg-primary px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            + Add Court
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-surface-high p-5 mb-5">
          <h2 className="font-semibold text-on-surface mb-4">{editing ? 'Edit Court' : 'New Court'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Court Name">
                <input
                  className={inputCls}
                  placeholder="e.g. Court 1"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Opens">
              <input type="time" className={inputCls} value={form.open}
                onChange={e => setForm(f => ({ ...f, open: e.target.value }))} />
            </Field>
            <Field label="Closes">
              <input type="time" className={inputCls} value={form.close}
                onChange={e => setForm(f => ({ ...f, close: e.target.value }))} />
            </Field>
            <Field label="Slot length (minutes)">
              <div className={`${inputCls} text-on-surface-muted bg-surface cursor-not-allowed`}>
                30 min — fixed base unit (customers choose 60 / 90 / 120 when booking)
              </div>
            </Field>
            <Field label="Day / Night boundary">
              <input type="time" className={inputCls} value={form.dayNightBoundary}
                onChange={e => setForm(f => ({ ...f, dayNightBoundary: e.target.value }))} />
              <p className="text-[11px] text-on-surface-muted mt-1">Splits day vs. night pricing</p>
            </Field>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.name.trim()}
              className="bg-primary text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50 hover:bg-primary-dark transition-colors"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Court'}
            </button>
            <button onClick={cancelForm}
              className="text-sm font-medium text-on-surface-muted px-5 py-2 rounded-lg border border-outline-variant hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
          {saveMutation.isError && (
            <p className="text-xs text-red-600 mt-3">Failed to save. Please try again.</p>
          )}
        </div>
      )}

      {/* Active courts */}
      {courts.length === 0 ? (
        <div className="text-center py-16 text-sm text-on-surface-muted">
          No courts yet. Add your first court above.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeCourts.map(c => (
              <CourtCard
                key={c.id}
                court={c}
                onEdit={() => editCourt(c)}
                onToggle={() => {
                  if (window.confirm(`Deactivate "${c.name}"? It will be hidden from customers.`)) {
                    toggleMutation.mutate({ id: c.id, active: false });
                  }
                }}
                toggling={toggleMutation.isPending}
              />
            ))}
          </div>

          {/* Inactive courts */}
          {inactiveCourts.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-[#9aab9a] uppercase tracking-wider mb-3">
                Inactive Courts
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {inactiveCourts.map(c => (
                  <CourtCard
                    key={c.id}
                    court={c}
                    onEdit={() => editCourt(c)}
                    onToggle={() => toggleMutation.mutate({ id: c.id, active: true })}
                    toggling={toggleMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CourtCard({
  court, onEdit, onToggle, toggling,
}: {
  court: Court;
  onEdit: () => void;
  onToggle: () => void;
  toggling: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 transition-colors ${
      court.active
        ? 'border-surface-high hover:border-primary/40'
        : 'border-[#f0f0f0] opacity-70'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-on-surface text-base">{court.name}</p>
          {court.active ? (
            <p className="text-xs text-green-700 bg-green-50 rounded-full px-2 py-0.5 inline-block mt-1">Active</p>
          ) : (
            <p className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 inline-block mt-1">Inactive</p>
          )}
        </div>
        <button
          onClick={onEdit}
          className="text-xs font-medium text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-primary-light transition-colors"
        >
          Edit
        </button>
      </div>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex justify-between">
          <span className="text-on-surface-muted">Hours</span>
          <span className="font-medium text-on-surface">
            {court.openingHours.open.slice(0, 5)} – {court.openingHours.close.slice(0, 5)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-muted">Day/Night split</span>
          <span className="font-medium text-on-surface">{court.dayNightBoundary.slice(0, 5)}</span>
        </div>
      </div>

      {court.active ? (
        <button
          onClick={onToggle}
          disabled={toggling}
          className="w-full text-xs font-medium text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          Deactivate
        </button>
      ) : (
        <button
          onClick={onToggle}
          disabled={toggling}
          className="w-full text-xs font-medium text-primary border border-primary rounded-lg px-3 py-1.5 hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          Reactivate
        </button>
      )}
    </div>
  );
}
