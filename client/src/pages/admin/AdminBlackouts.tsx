import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourts, adminGetBlackouts, adminCreateBlackout, adminDeleteBlackout } from '../../lib/api';
import { Court, Blackout } from '../../types';
import { formatDateTime } from '../../lib/utils';

export function AdminBlackouts() {
  const qc = useQueryClient();
  const [courtId, setCourtId] = useState('');
  const [form, setForm] = useState({ courtId: '', start: '', end: '', reason: '' });
  const [showForm, setShowForm] = useState(false);

  const { data: courts = [] } = useQuery<Court[]>({ queryKey: ['courts'], queryFn: getCourts });
  const { data: blackouts = [] } = useQuery<Blackout[]>({
    queryKey: ['blackouts', courtId],
    queryFn: () => adminGetBlackouts(courtId || undefined),
  });

  const createMutation = useMutation({
    mutationFn: () => adminCreateBlackout(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blackouts'] }); setShowForm(false); setForm({ courtId: '', start: '', end: '', reason: '' }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteBlackout(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blackouts'] }),
  });

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-[#191c19]">Blackouts</h1>
        <button onClick={() => setShowForm(true)}
          className="text-sm font-semibold text-white bg-[#1b5e3b] px-3 py-1.5 rounded-lg">
          + Add
        </button>
      </div>

      <div className="mb-4">
        <select className="w-full border border-[#bfc9bf] rounded-lg px-3 py-2 text-sm"
          value={courtId} onChange={e => setCourtId(e.target.value)}>
          <option value="">All Courts</option>
          {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-[#e6e9e4] p-4 mb-4 space-y-3">
          <h2 className="font-semibold">New Blackout</h2>
          <div>
            <label className="block text-xs font-medium text-[#404942] mb-1">Court</label>
            <select className="w-full border border-[#bfc9bf] rounded-lg px-3 py-2 text-sm"
              value={form.courtId} onChange={e => setForm(f => ({...f, courtId: e.target.value}))}>
              <option value="">Select…</option>
              {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#404942] mb-1">Start</label>
              <input type="datetime-local" className="w-full border border-[#bfc9bf] rounded-lg px-3 py-2 text-sm"
                value={form.start} onChange={e => setForm(f => ({...f, start: e.target.value}))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#404942] mb-1">End</label>
              <input type="datetime-local" className="w-full border border-[#bfc9bf] rounded-lg px-3 py-2 text-sm"
                value={form.end} onChange={e => setForm(f => ({...f, end: e.target.value}))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#404942] mb-1">Reason (optional)</label>
            <input className="w-full border border-[#bfc9bf] rounded-lg px-3 py-2 text-sm"
              value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}
              className="flex-1 bg-[#1b5e3b] text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50">
              {createMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="flex-1 text-sm text-[#404942] py-2 rounded-lg border border-[#bfc9bf]">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {blackouts.length === 0
          ? <p className="text-sm text-[#404942] text-center py-8">No blackouts.</p>
          : blackouts.map(bl => (
            <div key={bl.id} className="bg-white rounded-xl border border-[#e6e9e4] p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#191c19]">
                  {formatDateTime(bl.start)} → {formatDateTime(bl.end)}
                </p>
                {bl.reason && <p className="text-xs text-[#404942] mt-0.5">{bl.reason}</p>}
              </div>
              <button onClick={() => deleteMutation.mutate(bl.id)}
                className="text-xs text-red-600 font-medium ml-4">
                Remove
              </button>
            </div>
          ))
        }
      </div>
    </div>
  );
}
