import type { PriceRate, DayType, PriceBand } from '../../types';
import { Input } from '../ui/Input';

export type Grid = Record<`${DayType}_${PriceBand}`, string>;

export const emptyGrid: Grid = { Weekday_Day: '', Weekday_Night: '', Weekend_Day: '', Weekend_Night: '' };

export function gridFromRates(rates: PriceRate[]): Grid {
  const g: Grid = { ...emptyGrid };
  rates.forEach((r) => {
    g[`${r.dayType}_${r.band}`] = String(r.price);
  });
  return g;
}

export function isValidPrice(value: string): boolean {
  if (value.trim() === '') return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

export function isGridValid(grid: Grid): boolean {
  return (Object.values(grid) as string[]).every((v) => isValidPrice(v));
}

export function gridToRateRequests(grid: Grid) {
  return [
    { dayType: 'Weekday' as DayType, band: 'Day' as PriceBand, price: parseFloat(grid.Weekday_Day) },
    { dayType: 'Weekday' as DayType, band: 'Night' as PriceBand, price: parseFloat(grid.Weekday_Night) },
    { dayType: 'Weekend' as DayType, band: 'Day' as PriceBand, price: parseFloat(grid.Weekend_Day) },
    { dayType: 'Weekend' as DayType, band: 'Night' as PriceBand, price: parseFloat(grid.Weekend_Night) },
  ];
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

export function RateGridEditor({ grid, onChange }: { grid: Grid; onChange: (grid: Grid) => void }) {
  const setCell = (key: keyof Grid) => (value: string) => onChange({ ...grid, [key]: value });

  return (
    <div className="space-y-4">
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
  );
}
