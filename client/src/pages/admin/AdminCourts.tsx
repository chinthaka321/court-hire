import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourts, createCourt, updateCourt } from '../../lib/api';
import type { Court } from '../../types';

interface CourtForm {
  name: string;
  open: string;
  close: string;
  slotLengthMinutes: number;
  dayNightBoundary: string;
}

const blank: CourtForm = { name: '', open: '07:00', close: '22:00', slotLengthMinutes: 60, dayNightBoundary: '18:00' };

const inputCls = 'w-full border border-[#bfc9bf] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1b5e3b] bg-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#404942] mb-1">{label}</label>
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
    queryKey: ['courts'],
    queryFn: getCourts,
  });

  const saveMutation = useMutation({
    mutationFn: () => editing ? updateCourt(editing, form) : createCourt(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courts'] });
      setShowForm(false);
      setEditing(null);
      setForm(blank);
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

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#191c19]">Courts</h1>
          <p className="text-sm text-[#404942] mt-0.5">Configure hours, slot length, and pricing boundaries</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditing(null); setForm(blank); setShowForm(true); }}
            className="text-sm font-semibold text-white bg-[#1b5e3b] px-4 py-2 rounded-lg hover:bg-[#004527] transition-colors"
          >
            + Add Court
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-[#e6e9e4] p-5 mb-5">
          <h2 className="font-semibold text-[#191c19] mb-4">{editing ? 'Edit Court' : 'New Court'}</h2>
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
              <select className={inputCls} value={form.slotLengthMinutes}
                onChange={e => setForm(f => ({ ...f, slotLengthMinutes: +e.target.value }))}>
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>120 min</option>
              </select>
            </Field>
            <Field label="Day / Night boundary">
              <input type="time" className={inputCls} value={form.dayNightBoundary}
                onChange={e => setForm(f => ({ ...f, dayNightBoundary: e.target.value }))} />
              <p className="text-[11px] text-[#404942] mt-1">Splits day vs. night pricing</p>
            </Field>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.name.trim()}
              className="bg-[#1b5e3b] text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50 hover:bg-[#004527] transition-colors"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Court'}
            </button>
            <button onClick={cancelForm}
              className="text-sm font-medium text-[#404942] px-5 py-2 rounded-lg border border-[#bfc9bf] hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Court cards */}
      {courts.length === 0 ? (
        <div className="text-center py-16 text-sm text-[#404942]">
          No courts yet. Add your first court above.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {courts.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-[#e6e9e4] p-5 hover:border-[#1b5e3b]/40 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-[#191c19] text-base">{c.name}</p>
                  <p className="text-xs text-green-700 bg-green-50 rounded-full px-2 py-0.5 inline-block mt-1">Active</p>
                </div>
                <button
                  onClick={() => editCourt(c)}
                  className="text-xs font-medium text-[#1b5e3b] border border-[#1b5e3b] rounded-lg px-3 py-1.5 hover:bg-[#e8f5ee] transition-colors"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#404942]">Hours</span>
                  <span className="font-medium text-[#191c19]">
                    {c.openingHours.open.slice(0, 5)} – {c.openingHours.close.slice(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#404942]">Slot length</span>
                  <span className="font-medium text-[#191c19]">{c.slotLengthMinutes} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#404942]">Day/Night split</span>
                  <span className="font-medium text-[#191c19]">{c.dayNightBoundary.slice(0, 5)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
