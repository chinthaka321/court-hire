import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourts, adminGetPricing, adminUpsertPricing } from '../../lib/api';
import { Court, PriceRate, DayType, PriceBand } from '../../types';
import { formatPrice } from '../../lib/utils';

type Grid = Record<`${DayType}_${PriceBand}`, string>;

const KEYS: Array<{ dayType: DayType; band: PriceBand; label: string }> = [
  { dayType: 'Weekday', band: 'Day',   label: 'Weekday Day' },
  { dayType: 'Weekday', band: 'Night', label: 'Weekday Night' },
  { dayType: 'Weekend', band: 'Day',   label: 'Weekend Day' },
  { dayType: 'Weekend', band: 'Night', label: 'Weekend Night' },
];

export function AdminPricing() {
  const [selectedCourtId, setSelectedCourtId] = useState<string>('');
  const [grid, setGrid] = useState<Grid>({ Weekday_Day: '', Weekday_Night: '', Weekend_Day: '', Weekend_Night: '' });
  const qc = useQueryClient();

  const { data: courts = [] } = useQuery<Court[]>({
    queryKey: ['courts'],
    queryFn: getCourts,
    onSuccess: (data) => { if (data[0] && !selectedCourtId) setSelectedCourtId(data[0].id); },
  } as any);

  useQuery<PriceRate[]>({
    queryKey: ['admin-pricing', selectedCourtId],
    queryFn: () => adminGetPricing(selectedCourtId),
    enabled: !!selectedCourtId,
    onSuccess: (rates: PriceRate[]) => {
      const g: Grid = { Weekday_Day: '', Weekday_Night: '', Weekend_Day: '', Weekend_Night: '' };
      rates.forEach(r => { g[`${r.dayType}_${r.band}`] = String(r.price); });
      setGrid(g);
    },
  } as any);

  const saveMutation = useMutation({
    mutationFn: () => adminUpsertPricing(selectedCourtId, KEYS.map(k => ({
      dayType: k.dayType,
      band: k.band,
      price: parseFloat(grid[`${k.dayType}_${k.band}`] || '0'),
    }))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pricing', selectedCourtId] }),
  });

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-8">
      <h1 className="text-xl font-bold text-[#191c19] mb-4">Pricing</h1>

      <div className="mb-4">
        <label className="block text-xs font-medium text-[#404942] mb-1">Court</label>
        <select
          className="w-full border border-[#bfc9bf] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1b5e3b]"
          value={selectedCourtId}
          onChange={e => setSelectedCourtId(e.target.value)}
        >
          {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-[#e6e9e4] overflow-hidden mb-4">
        <div className="grid grid-cols-3 bg-[#f2f4ef] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[#404942]">
          <span>Slot Type</span>
          <span>Price</span>
          <span>Preview</span>
        </div>
        {KEYS.map(k => {
          const key = `${k.dayType}_${k.band}` as keyof Grid;
          return (
            <div key={key} className="grid grid-cols-3 items-center px-4 border-t border-[#f0f0f0]"
                 style={{ height: '56px' }}>
              <span className="text-sm text-[#191c19]">{k.label}</span>
              <div className="flex items-center gap-1">
                <span className="text-sm text-[#404942]">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-20 border border-[#bfc9bf] rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-[#1b5e3b]"
                  value={grid[key]}
                  onChange={e => setGrid(g => ({ ...g, [key]: e.target.value }))}
                />
              </div>
              <span className="text-sm font-medium text-[#1b5e3b]">
                {grid[key] ? formatPrice(parseFloat(grid[key])) : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || !selectedCourtId}
        className="w-full bg-[#1b5e3b] text-white font-semibold py-3 rounded-[10px] disabled:opacity-50"
      >
        {saveMutation.isPending ? 'Saving…' : 'Save Pricing'}
      </button>
    </div>
  );
}
