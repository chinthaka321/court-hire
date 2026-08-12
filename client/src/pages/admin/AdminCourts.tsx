import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminGetCourts, adminToggleCourt, createCourt, updateCourt, deleteCourt, adminGetPricing, apiErrorMessage } from '../../lib/api';
import type { Court, PriceRate } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input, Field } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { RateGridEditor, emptyGrid, gridFromRates, isGridValid, gridToRateRequests, type Grid } from '../../components/admin/RateGrid';
import { useToast } from '../../components/ui/ToastContext';
import { Plus, Edit2, AlertCircle } from 'lucide-react';

interface CourtForm {
  name: string;
  open: string;
  close: string;
  slotLengthMinutes: number;
  dayNightBoundary: string;
  rates: Grid;
}

const blank: CourtForm = { name: '', open: '07:00', close: '22:00', slotLengthMinutes: 30, dayNightBoundary: '18:00', rates: emptyGrid };

export function AdminCourts() {
  const qc = useQueryClient();
  const { showToast } = useToast();
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
    mutationFn: () => {
      const payload = {
        name: form.name,
        open: form.open,
        close: form.close,
        slotLengthMinutes: form.slotLengthMinutes,
        dayNightBoundary: form.dayNightBoundary,
        priceRates: gridToRateRequests(form.rates),
      };
      return editing ? updateCourt(editing, payload) : createCourt(payload);
    },
    onSuccess: () => {
      invalidateCourtDependents();
      showToast(editing ? 'Court updated successfully!' : 'New court registered!', 'success');
      setShowForm(false);
      setEditing(null);
      setForm(blank);
    },
    onError: (e: unknown) => {
      showToast(apiErrorMessage(e, 'Failed to save court parameters.'), 'error');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => adminToggleCourt(id, active),
    onSuccess: (_, variables) => {
      invalidateCourtDependents();
      showToast(variables.active ? 'Court reactivated!' : 'Court deactivated!', 'info');
    },
    onError: (e: unknown) => {
      showToast(apiErrorMessage(e, 'Failed to toggle court status.'), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCourt(id),
    onSuccess: () => {
      invalidateCourtDependents();
      showToast('Court removed permanently.', 'success');
    },
    onError: (e: unknown) => {
      showToast(apiErrorMessage(e, 'Cannot delete court with booking history.'), 'error');
    },
  });

  const loadRatesMutation = useMutation({
    mutationFn: (courtId: string) =>
      qc.fetchQuery<PriceRate[]>({ queryKey: ['admin-pricing', courtId], queryFn: () => adminGetPricing(courtId) }),
    onSuccess: (rates) => setForm((f) => ({ ...f, rates: gridFromRates(rates) })),
    onError: (e: unknown) => {
      showToast(apiErrorMessage(e, 'Failed to load existing pricing.'), 'error');
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
      rates: emptyGrid,
    });
    setShowForm(true);
    loadRatesMutation.mutate(c.id);
  }

  function cancelForm() {
    setShowForm(false);
    setEditing(null);
    setForm(blank);
  }

  const activeCourts = courts.filter((c) => c.active);
  const inactiveCourts = courts.filter((c) => !c.active);

  const isTimeInvalid = form.close !== '00:00' && form.close <= form.open;
  const isFormInvalid = !form.name.trim() || isTimeInvalid || !isGridValid(form.rates);

  return (
    <div className="px-4 sm:px-8 py-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Courts Manager</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1">
            Configure court names, operating hours, and day/night pricing boundaries.
          </p>
        </div>
        {!showForm && (
          <Button
            className="self-start sm:self-auto shrink-0 bg-emerald-600 hover:bg-emerald-700 font-extrabold shadow-md shadow-emerald-600/20"
            onClick={() => {
              setEditing(null);
              setForm(blank);
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add New Court
          </Button>
        )}
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit Court Parameters' : 'Register New Court'} onClose={cancelForm}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <Field label="Court Display Name" htmlFor="court-name">
                <Input
                  id="court-name"
                  placeholder="e.g. Center Court (Clay)"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="Opening Time" htmlFor="court-open">
              <Input
                id="court-open"
                type="time"
                value={form.open}
                onChange={(e) => setForm((f) => ({ ...f, open: e.target.value }))}
              />
            </Field>
            <Field label="Closing Time" htmlFor="court-close">
              <Input
                id="court-close"
                type="time"
                value={form.close}
                onChange={(e) => setForm((f) => ({ ...f, close: e.target.value }))}
              />
            </Field>
            <Field label="Base Slot Length" htmlFor="court-slot-length">
              <input
                id="court-slot-length"
                type="text"
                disabled
                readOnly
                value={`${form.slotLengthMinutes} minutes (Fixed System Standard)`}
                className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-500 bg-slate-50 cursor-not-allowed select-none"
              />
            </Field>
            <Field label="Day / Night Rate Boundary" htmlFor="court-boundary" hint="Separates Day and Night pricing bands">
              <Input
                id="court-boundary"
                type="time"
                value={form.dayNightBoundary}
                onChange={(e) => setForm((f) => ({ ...f, dayNightBoundary: e.target.value }))}
              />
            </Field>
          </div>

          {isTimeInvalid && (
            <p className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
              <AlertCircle className="w-4 h-4" /> Closing time must be after opening time.
            </p>
          )}

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Pricing Matrix (Weekday/Weekend x Day/Night)</p>
            {loadRatesMutation.isPending ? (
              <div className="grid grid-cols-2 gap-3 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-slate-100 rounded-2xl" />
                ))}
              </div>
            ) : (
              <RateGridEditor grid={form.rates} onChange={(rates) => setForm((f) => ({ ...f, rates }))} />
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || loadRatesMutation.isPending || isFormInvalid}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Parameters'}
            </Button>
            <Button variant="outline" onClick={cancelForm}>
              Cancel
            </Button>
          </div>
        </Modal>
      )}

      {courts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-xl">
          <p className="text-lg font-bold text-slate-800">No Courts Configured</p>
          <p className="text-sm text-slate-400 mt-1">Click &quot;Add New Court&quot; above to setup your facility.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {activeCourts.map((c) => (
              <CourtCard
                key={c.id}
                court={c}
                onEdit={() => editCourt(c)}
                onToggle={() => {
                  if (window.confirm(`Deactivate "${c.name}"? It will be hidden from public booking.`)) {
                    toggleMutation.mutate({ id: c.id, active: false });
                  }
                }}
                toggling={toggleMutation.isPending && toggleMutation.variables?.id === c.id}
                onDelete={() => {
                  if (window.confirm(`Permanently remove "${c.name}"?`)) {
                    deleteMutation.mutate(c.id);
                  }
                }}
                deleting={deleteMutation.isPending && deleteMutation.variables === c.id}
              />
            ))}
          </div>

          {inactiveCourts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">
                Deactivated / Inactive Courts
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {inactiveCourts.map((c) => (
                  <CourtCard
                    key={c.id}
                    court={c}
                    onEdit={() => editCourt(c)}
                    onToggle={() => toggleMutation.mutate({ id: c.id, active: true })}
                    toggling={toggleMutation.isPending && toggleMutation.variables?.id === c.id}
                    onDelete={() => {
                      if (window.confirm(`Permanently remove "${c.name}"?`)) {
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
  court,
  onEdit,
  onToggle,
  toggling,
  onDelete,
  deleting,
}: {
  court: Court;
  onEdit: () => void;
  onToggle: () => void;
  toggling: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-3xl border p-6 transition-all duration-300 shadow-xl shadow-slate-200/40 flex flex-col justify-between ${
        court.active ? 'border-slate-200 hover:border-emerald-300' : 'border-slate-200 bg-slate-50/60 opacity-85'
      }`}
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-black text-slate-900 text-lg tracking-tight">{court.name}</h3>
            {court.active ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full mt-2 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-200 px-3 py-1 rounded-full mt-2">
                Offline / Deactivated
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={onEdit} className="rounded-xl font-bold">
            <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
        </div>

        <div className="space-y-3 text-xs border-t border-slate-100 pt-4 mb-6">
          <div className="flex justify-between">
            <span className="text-slate-400 font-bold uppercase tracking-wider">Hours</span>
            <span className="font-black text-slate-900">
              {court.openingHours.open.slice(0, 5)} – {court.openingHours.close.slice(0, 5)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 font-bold uppercase tracking-wider">Night Rate Boundary</span>
            <span className="font-black text-slate-900">{court.dayNightBoundary.slice(0, 5)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2.5 pt-2 border-t border-slate-100">
        {court.active ? (
          <Button variant="danger" size="sm" className="flex-1 rounded-xl" onClick={onToggle} disabled={toggling || deleting}>
            {toggling ? 'Deactivating...' : 'Deactivate'}
          </Button>
        ) : (
          <Button variant="subtle-primary" size="sm" className="flex-1 rounded-xl" onClick={onToggle} disabled={toggling || deleting}>
            {toggling ? 'Reactivating...' : 'Reactivate'}
          </Button>
        )}
        <Button
          variant="danger-solid"
          size="sm"
          onClick={onDelete}
          disabled={toggling || deleting}
          className="rounded-xl"
        >
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </div>
  );
}
