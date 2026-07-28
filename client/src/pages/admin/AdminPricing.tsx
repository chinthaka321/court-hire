import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourts, adminGetPricing, adminUpsertPricing, apiErrorMessage } from '../../lib/api';
import type { Court, PriceRate, DayType, PriceBand } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/ToastContext';
import { Info } from 'lucide-react';

type Grid = Record<`${DayType}_${PriceBand}`, string>;

const emptyGrid: Grid = { Weekday_Day: '', Weekday_Night: '', Weekend_Day: '', Weekend_Night: '' };

function gridFromRates(rates: PriceRate[]): Grid {
  const g: Grid = { ...emptyGrid };
  rates.forEach((r) => {
    g[`${r.dayType}_${r.band}`] = String(r.price);
  });
  return g;
}

function PriceCell({
  dayType,
  band,
  value,
  onChange,
}: {
  dayType: DayType;
  band: PriceBand;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-emerald-400 transition-all">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 text-center">
        {dayType} • {band}
      </p>
      <div className="flex items-center gap-1">
        <span className="text-sm font-black text-slate-400">$</span>
        <Input
          type="number"
          min="0"
          step="0.50"
          className="text-base font-black text-center"
          value={value}
          placeholder="0.00"
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function isValidPrice(value: string): boolean {
  if (value.trim() === '') return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

function RateGridEditor({ courtId, initialRates }: { courtId: string; initialRates: PriceRate[] }) {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [grid, setGrid] = useState<Grid>(() => gridFromRates(initialRates));

  const isGridInvalid = (Object.values(grid) as string[]).some((v) => !isValidPrice(v));

  const saveMutation = useMutation({
    mutationFn: () =>
      adminUpsertPricing(courtId, [
        { dayType: 'Weekday', band: 'Day', price: parseFloat(grid.Weekday_Day) },
        { dayType: 'Weekday', band: 'Night', price: parseFloat(grid.Weekday_Night) },
        { dayType: 'Weekend', band: 'Day', price: parseFloat(grid.Weekend_Day) },
        { dayType: 'Weekend', band: 'Night', price: parseFloat(grid.Weekend_Night) },
      ]),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pricing', courtId] });
      showToast('Pricing matrix updated successfully!', 'success');
    },
    onError: (e: unknown) => {
      showToast(apiErrorMessage(e, 'Failed to update pricing.'), 'error');
    },
  });

  const setCell = (key: keyof Grid) => (value: string) => setGrid((g) => ({ ...g, [key]: value }));

  return (
    <>
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 mb-6 space-y-4">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-3 mb-1">
          <div className="w-20" />
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 text-center">Day Band</p>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 text-center">Night Band</p>
        </div>

        <div className="grid grid-cols-[auto_1fr_1fr] gap-3 items-center">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 w-20">Weekday</p>
          <PriceCell dayType="Weekday" band="Day" value={grid.Weekday_Day} onChange={setCell('Weekday_Day')} />
          <PriceCell dayType="Weekday" band="Night" value={grid.Weekday_Night} onChange={setCell('Weekday_Night')} />
        </div>

        <div className="grid grid-cols-[auto_1fr_1fr] gap-3 items-center">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400 w-20">Weekend</p>
          <PriceCell dayType="Weekend" band="Day" value={grid.Weekend_Day} onChange={setCell('Weekend_Day')} />
          <PriceCell dayType="Weekend" band="Night" value={grid.Weekend_Night} onChange={setCell('Weekend_Night')} />
        </div>
      </div>

      <p className="text-xs text-slate-400 font-medium mb-4">
        Price changes apply exclusively to new bookings. Existing holds and confirmed bookings maintain captured amounts.
      </p>

      {isGridInvalid && (
        <p className="text-xs font-bold text-rose-600 mb-4">
          All four grid cells must contain valid rates greater than or equal to $0.00.
        </p>
      )}

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || isGridInvalid}
        className="bg-emerald-600 hover:bg-emerald-700 font-extrabold rounded-2xl px-6 py-3"
      >
        {saveMutation.isPending ? 'Saving Matrix...' : 'Save Rate Table'}
      </Button>
    </>
  );
}

export function AdminPricing() {
  const [pickedCourtId, setPickedCourtId] = useState<string | null>(null);

  const { data: courts = [] } = useQuery<Court[]>({ queryKey: ['courts'], queryFn: getCourts });
  const selectedCourtId = pickedCourtId ?? courts[0]?.id ?? '';

  const { data: rates, isLoading: ratesLoading } = useQuery<PriceRate[]>({
    queryKey: ['admin-pricing', selectedCourtId],
    queryFn: () => adminGetPricing(selectedCourtId),
    enabled: !!selectedCourtId,
  });

  const selectedCourt = courts.find((c) => c.id === selectedCourtId);

  return (
    <div className="px-4 sm:px-8 py-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pricing Matrix</h1>
        <p className="text-sm font-semibold text-slate-500 mt-1">
          Set the 2×2 price grid (Weekday/Weekend × Day/Night) per court.
        </p>
      </div>

      {courts.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {courts.map((c) => (
            <button
              key={c.id}
              onClick={() => setPickedCourtId(c.id)}
              className={`text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-2xl border transition-all cursor-pointer ${
                selectedCourtId === c.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {selectedCourt && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-xs font-bold text-emerald-900 flex items-center gap-3">
            <Info className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Day/Night Split Boundary: <strong className="text-slate-900">{selectedCourt.dayNightBoundary.slice(0, 5)}</strong>. Slots before this time use the Day rate; slots at or after use the Night rate.
            </span>
          </div>

          {ratesLoading ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 animate-pulse">
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-slate-200 rounded-2xl" />
                ))}
              </div>
            </div>
          ) : (
            rates && <RateGridEditor key={selectedCourt.id} courtId={selectedCourt.id} initialRates={rates} />
          )}
        </div>
      )}
    </div>
  );
}
