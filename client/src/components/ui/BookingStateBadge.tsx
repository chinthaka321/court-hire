const cfg: Record<string, string> = {
  Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  NoShow: 'bg-rose-100 text-rose-800 border-rose-200',
};

export function BookingStateBadge({ state }: { state: string }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
        cfg[state] ?? 'bg-slate-100 text-slate-600 border-slate-200'
      }`}
    >
      {state === 'NoShow' ? 'No-show' : state}
    </span>
  );
}
