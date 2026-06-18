import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourts, createCourt, updateCourt } from '../../lib/api';
import { Court } from '../../types';

interface CourtForm {
  name: string;
  open: string;
  close: string;
  slotLengthMinutes: number;
  dayNightBoundary: string;
}

const blank: CourtForm = { name: '', open: '07:00', close: '22:00', slotLengthMinutes: 60, dayNightBoundary: '18:00' };

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
    mutationFn: () => editing
      ? updateCourt(editing, form)
      : createCourt(form),
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

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#191c19]">Courts</h1>
        <button
          onClick={() => { setEditing(null); setForm(blank); setShowForm(true); }}
          className="text-sm font-semibold text-white bg-[#1b5e3b] px-3 py-1.5 rounded-lg"
        >
          + Add Court
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-[#e6e9e4] p-4 mb-4">
          <h2 className="font-semibold mb-3">{editing ? 'Edit Court' : 'New Court'}</h2>
          <div className="space-y-3">
            <Field label="Name">
              <input className={inputCls} value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Opens">
                <input type="time" className={inputCls} value={form.open} onChange={e => setForm(f => ({...f, open: e.target.value}))} />
              </Field>
              <Field label="Closes">
                <input type="time" className={inputCls} value={form.close} onChange={e => setForm(f => ({...f, close: e.target.value}))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Slot (min)">
                <input type="number" className={inputCls} value={form.slotLengthMinutes}
                  onChange={e => setForm(f => ({...f, slotLengthMinutes: +e.target.value}))} />
              </Field>
              <Field label="Day/Night split">
                <input type="time" className={inputCls} value={form.dayNightBoundary}
                  onChange={e => setForm(f => ({...f, dayNightBoundary: e.target.value}))} />
              </Field>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex-1 bg-[#1b5e3b] text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditing(null); }}
              className="flex-1 text-sm font-medium text-[#404942] py-2 rounded-lg border border-[#bfc9bf]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {courts.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-[#e6e9e4] p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-[#191c19]">{c.name}</p>
              <button onClick={() => editCourt(c)} className="text-xs text-[#1b5e3b] font-medium">
                Edit
              </button>
            </div>
            <p className="text-xs text-[#404942] mt-1">
              {c.openingHours.open.slice(0,5)} – {c.openingHours.close.slice(0,5)} &bull; {c.slotLengthMinutes}min slots
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-[#bfc9bf] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1b5e3b]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#404942] mb-1">{label}</label>
      {children}
    </div>
  );
}
