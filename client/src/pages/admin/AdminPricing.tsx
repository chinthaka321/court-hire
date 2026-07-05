import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourts, adminGetPricing, adminUpsertPricing } from '../../lib/api';
import type { Court, PriceRate, DayType, PriceBand } from '../../types';

type Grid = Record<`${DayType}_${PriceBand}`, string>;

const emptyGrid: Grid = { Weekday_Day: '', Weekday_Night: '', Weekend_Day: '', Weekend_Night: '' };

const inputCls = 'w-full border border-outline-variant rounded-lg px-3 py-2.5 text-base font-semibold text-on-surface focus:outline-none focus:border-primary text-center bg-white';

function gridFromRates(rates: PriceRate[]): Grid {
  const g: Grid = { ...emptyGrid };
  rates.forEach(r => { g[`${r.dayType}_${r.band}`] = String(r.price); });
  return g;
}

function PriceCell({
  dayType, band, value, onChange,
}: {
  dayType: DayType;
  band: PriceBand;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="p-4 bg-white border border-surface-high rounded-xl">
      <p className="text-xs font-medium text-on-surface-muted mb-2 text-center">
        {dayType} · {band}
      </p>
      <div className="flex items-center gap-1">
        <span className="text-sm text-on-surface-muted font-medium">$</span>
        <input
          type="number"
          min="0"
          step="0.50"
          className={inputCls}
          value={value}
          placeholder="0.00"
          onChange={e => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function RateGridEditor({ courtId, initialRates }: { courtId: string; initialRates: PriceRate[] }) {
  const qc = useQueryClient();
  const [grid, setGrid] = useState<Grid>(() => gridFromRates(initialRates));

  const saveMutation = useMutation({
    mutationFn: () => adminUpsertPricing(courtId, [
      { dayType: 'Weekday', band: 'Day',   price: parseFloat(grid.Weekday_Day   || '0') },
      { dayType: 'Weekday', band: 'Night', price: parseFloat(grid.Weekday_Night || '0') },
      { dayType: 'Weekend', band: 'Day',   price: parseFloat(grid.Weekend_Day   || '0') },
      { dayType: 'Weekend', band: 'Night', price: parseFloat(grid.Weekend_Night || '0') },
    ]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-pricing', courtId] }),
  });

  const setCell = (key: keyof Grid) => (value: string) =>
    setGrid(g => ({ ...g, [key]: value }));

  return (
    <>
      {/* 2×2 price grid */}
      <div className="bg-surface rounded-xl border border-surface-high p-4 mb-5">
        {/* Column headers */}
        <div className="grid grid-cols-[auto_1fr_1fr] gap-3 mb-3">
          <div className="w-16" />
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-muted text-center">Day</p>
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-muted text-center">Night</p>
        </div>

        {/* Weekday row */}
        <div className="grid grid-cols-[auto_1fr_1fr] gap-3 mb-3 items-center">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-muted w-16">Weekday</p>
          <PriceCell dayType="Weekday" band="Day"   value={grid.Weekday_Day}   onChange={setCell('Weekday_Day')} />
          <PriceCell dayType="Weekday" band="Night" value={grid.Weekday_Night} onChange={setCell('Weekday_Night')} />
        </div>

        {/* Weekend row */}
        <div className="grid grid-cols-[auto_1fr_1fr] gap-3 items-center">
          <p className="text-xs font-bold uppercase tracking-wider text-on-surface-muted w-16">Weekend</p>
          <PriceCell dayType="Weekend" band="Day"   value={grid.Weekend_Day}   onChange={setCell('Weekend_Day')} />
          <PriceCell dayType="Weekend" band="Night" value={grid.Weekend_Night} onChange={setCell('Weekend_Night')} />
        </div>
      </div>

      <p className="text-xs text-on-surface-muted mb-4">
        Price changes only affect new bookings. Existing holds and confirmed bookings retain their captured price.
      </p>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="bg-primary text-white font-semibold py-3 px-6 rounded-xl text-sm disabled:opacity-50 hover:bg-primary-dark transition-colors"
      >
        {saveMutation.isPending ? 'Saving…' : 'Save Pricing'}
      </button>

      {saveMutation.isSuccess && (
        <span className="ml-3 text-sm text-green-700">Saved ✓</span>
      )}
      {saveMutation.isError && (
        <span className="ml-3 text-sm text-red-600">Failed to save — try again.</span>
      )}
    </>
  );
}

export function AdminPricing() {
  const [pickedCourtId, setPickedCourtId] = useState<string | null>(null);

  const { data: courts = [] } = useQuery<Court[]>({ queryKey: ['courts'], queryFn: getCourts });

  // Default to the first court until the admin picks one
  const selectedCourtId = pickedCourtId ?? courts[0]?.id ?? '';

  const { data: rates } = useQuery<PriceRate[]>({
    queryKey: ['admin-pricing', selectedCourtId],
    queryFn: () => adminGetPricing(selectedCourtId),
    enabled: !!selectedCourtId,
  });

  const selectedCourt = courts.find(c => c.id === selectedCourtId);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Pricing</h1>
        <p className="text-sm text-on-surface-muted mt-0.5">Set the 2×2 rate table per court</p>
      </div>

      {/* Court selector tabs */}
      {courts.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {courts.map(c => (
            <button
              key={c.id}
              onClick={() => setPickedCourtId(c.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCourtId === c.id
                  ? 'bg-primary text-white'
                  : 'bg-white border border-outline-variant text-on-surface-muted hover:border-primary hover:text-on-surface'
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
          <div className="bg-primary-light rounded-xl px-4 py-3 mb-5 text-sm text-primary">
            <span className="font-medium">Day/Night boundary:</span>{' '}
            {selectedCourt.dayNightBoundary.slice(0, 5)} — slots before this time are priced at the Day rate, after at the Night rate.
            <span className="text-xs text-on-surface-muted ml-1">Edit in Courts settings.</span>
          </div>

          {/* Keyed by court so switching courts always shows that court's saved rates */}
          {rates && <RateGridEditor key={selectedCourt.id} courtId={selectedCourt.id} initialRates={rates} />}
        </>
      )}
    </div>
  );
}
