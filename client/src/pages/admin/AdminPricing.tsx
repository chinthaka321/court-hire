import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourts, adminGetPricing, adminUpsertPricing } from '../../lib/api';
import type { Court, PriceRate, DayType, PriceBand } from '../../types';

type Grid = Record<`${DayType}_${PriceBand}`, string>;

const emptyGrid: Grid = { Weekday_Day: '', Weekday_Night: '', Weekend_Day: '', Weekend_Night: '' };

const inputCls = 'w-full border border-[#bfc9bf] rounded-lg px-3 py-2.5 text-base font-semibold text-[#191c19] focus:outline-none focus:border-[#1b5e3b] text-center bg-white';

export function AdminPricing() {
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [grid, setGrid] = useState<Grid>(emptyGrid);
  const qc = useQueryClient();

  const { data: courts = [] } = useQuery<Court[]>({ queryKey: ['courts'], queryFn: getCourts });

  useEffect(() => {
    if (courts[0] && !selectedCourtId) setSelectedCourtId(courts[0].id);
  }, [courts, selectedCourtId]);

  const { data: rates = [] } = useQuery<PriceRate[]>({
    queryKey: ['admin-pricing', selectedCourtId],
    queryFn: () => adminGetPricing(selectedCourtId),
    enabled: !!selectedCourtId,
  });

  useEffect(() => {
    if (!rates.length) return;
    const g: Grid = { ...emptyGrid };
    rates.forEach(r => { g[`${r.dayType}_${r.band}`] = String(r.price); });
    setGrid(g);
  }, [rates]);

  const saveMutation = useMutation({
    mutationFn: () => adminUpsertPricing(selectedCourtId, [
      { dayType: 'Weekday', band: 'Day',   price: parseFloat(grid.Weekday_Day   || '0') },
      { dayType: 'Weekday', band: 'Night', price: parseFloat(grid.Weekday_Night || '0') },
      { dayType: 'Weekend', band: 'Day',   price: parseFloat(grid.Weekend_Day   || '0') },
      { dayType: 'Weekend', band: 'Night', price: parseFloat(grid.Weekend_Night || '0') },
    ]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pricing', selectedCourtId] }),
  });

  const selectedCourt = courts.find(c => c.id === selectedCourtId);

  function PriceCell({ dayType, band }: { dayType: DayType; band: PriceBand }) {
    const key = `${dayType}_${band}` as keyof Grid;
    return (
      <div className="p-4 bg-white border border-[#e6e9e4] rounded-xl">
        <p className="text-xs font-medium text-[#404942] mb-2 text-center">
          {dayType} · {band}
        </p>
        <div className="flex items-center gap-1">
          <span className="text-sm text-[#404942] font-medium">$</span>
          <input
            type="number"
            min="0"
            step="0.50"
            className={inputCls}
            value={grid[key]}
            placeholder="0.00"
            onChange={e => setGrid(g => ({ ...g, [key]: e.target.value }))}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#191c19]">Pricing</h1>
        <p className="text-sm text-[#404942] mt-0.5">Set the 2×2 rate table per court</p>
      </div>

      {/* Court selector tabs */}
      {courts.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {courts.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCourtId(c.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCourtId === c.id
                  ? 'bg-[#1b5e3b] text-white'
                  : 'bg-white border border-[#bfc9bf] text-[#404942] hover:border-[#1b5e3b] hover:text-[#191c19]'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {selectedCourt && (
        <>
          {/* Day / Night boundary info */}
          <div className="bg-[#e8f5ee] rounded-xl px-4 py-3 mb-5 text-sm text-[#1b5e3b]">
            <span className="font-medium">Day/Night boundary:</span>{' '}
            {selectedCourt.dayNightBoundary.slice(0, 5)} — slots before this time are priced at the Day rate, after at the Night rate.
            <span className="text-xs text-[#404942] ml-1">Edit in Courts settings.</span>
          </div>

          {/* 2×2 price grid */}
          <div className="bg-[#f8faf5] rounded-xl border border-[#e6e9e4] p-4 mb-5">
            {/* Column headers */}
            <div className="grid grid-cols-[auto_1fr_1fr] gap-3 mb-3">
              <div />
              <p className="text-xs font-bold uppercase tracking-wider text-[#404942] text-center">Day</p>
              <p className="text-xs font-bold uppercase tracking-wider text-[#404942] text-center">Night</p>
            </div>

            {/* Weekday row */}
            <div className="grid grid-cols-[auto_1fr_1fr] gap-3 mb-3 items-center">
              <p className="text-xs font-bold uppercase tracking-wider text-[#404942] w-16">Weekday</p>
              <PriceCell dayType="Weekday" band="Day" />
              <PriceCell dayType="Weekday" band="Night" />
            </div>

            {/* Weekend row */}
            <div className="grid grid-cols-[auto_1fr_1fr] gap-3 items-center">
              <p className="text-xs font-bold uppercase tracking-wider text-[#404942] w-16">Weekend</p>
              <PriceCell dayType="Weekend" band="Day" />
              <PriceCell dayType="Weekend" band="Night" />
            </div>
          </div>

          <p className="text-xs text-[#404942] mb-4">
            Price changes only affect new bookings. Existing holds and confirmed bookings retain their captured price.
          </p>

          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !selectedCourtId}
            className="bg-[#1b5e3b] text-white font-semibold py-3 px-6 rounded-xl text-sm disabled:opacity-50 hover:bg-[#004527] transition-colors"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save Pricing'}
          </button>

          {saveMutation.isSuccess && (
            <span className="ml-3 text-sm text-green-700">Saved ✓</span>
          )}
        </>
      )}
    </div>
  );
}
