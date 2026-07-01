import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourts, adminGetBlackouts, adminCreateBlackout, adminDeleteBlackout } from '../../lib/api';
import type { Court, Blackout } from '../../types';
import { formatDateTime } from '../../lib/utils';

const inputCls = 'w-full border border-[#bfc9bf] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1b5e3b] bg-white';

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
    mutationFn: () => adminCreateBlackout(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['blackouts'] });
      setShowForm(false);
      setForm({ courtId: '', start: '', end: '', reason: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminDeleteBlackout(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blackouts'] }),
  });

  function isUpcoming(start: string) {
    return new Date(start) > new Date();
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#191c19]">Blackouts</h1>
          <p className="text-sm text-[#404942] mt-0.5">Block court time for maintenance or events</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-semibold text-white bg-[#1b5e3b] px-4 py-2 rounded-lg hover:bg-[#004527] transition-colors"
          >
            + Add Blackout
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-[#e6e9e4] p-5 mb-5">
          <h2 className="font-semibold text-[#191c19] mb-4">New Blackout</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#404942] mb-1">Court</label>
              <select className={inputCls} value={form.courtId}
                onChange={e => setForm(f => ({ ...f, courtId: e.target.value }))}>
                <option value="">Select court…</option>
                {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#404942] mb-1">Start</label>
              <input type="datetime-local" className={inputCls} value={form.start}
                onChange={e => setForm(f => ({ ...f, start: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#404942] mb-1">End</label>
              <input type="datetime-local" className={inputCls} value={form.end}
                onChange={e => setForm(f => ({ ...f, end: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#404942] mb-1">Reason (optional)</label>
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
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !form.courtId || !form.start || !form.end}
              className="bg-[#1b5e3b] text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50 hover:bg-[#004527] transition-colors"
            >
              {createMutation.isPending ? 'Saving…' : 'Save Blackout'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ courtId: '', start: '', end: '', reason: '' }); }}
              className="text-sm text-[#404942] px-5 py-2 rounded-lg border border-[#bfc9bf] hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <select
          className="border border-[#bfc9bf] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1b5e3b] bg-white"
          value={filterCourtId}
          onChange={e => setFilterCourtId(e.target.value)}
        >
          <option value="">All Courts</option>
          {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Blackout list */}
      {blackouts.length === 0 ? (
        <div className="text-center py-16 text-sm text-[#404942]">No blackouts scheduled.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {blackouts.map(bl => {
            const upcoming = isUpcoming(bl.start);
            return (
              <div
                key={bl.id}
                className={`bg-white rounded-xl border p-4 flex items-center justify-between gap-4 ${
                  upcoming ? 'border-[#e6e9e4]' : 'border-[#f0f0f0] opacity-60'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[#191c19]">
                      {courts.find(c => c.id === bl.courtId)?.name ?? 'Court'}
                    </p>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      upcoming ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {upcoming ? 'Upcoming' : 'Past'}
                    </span>
                  </div>
                  <p className="text-xs text-[#404942] mt-1">
                    {formatDateTime(bl.start)} → {formatDateTime(bl.end)}
                  </p>
                  {bl.reason && (
                    <p className="text-xs text-[#404942] mt-0.5 italic">{bl.reason}</p>
                  )}
                </div>
                {upcoming && (
                  <button
                    onClick={() => {
                      if (window.confirm('Remove this blackout?')) deleteMutation.mutate(bl.id);
                    }}
                    className="text-xs font-medium text-red-600 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
