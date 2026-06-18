import { SlotStatus } from '../types';
import { cn } from '../lib/utils';

const config: Record<SlotStatus, { label: string; className: string }> = {
  Available: { label: 'Available', className: 'bg-green-100 text-green-800' },
  Held:      { label: 'Held',      className: 'bg-amber-100 text-amber-800' },
  Booked:    { label: 'Booked',    className: 'bg-red-100 text-red-700' },
  Past:      { label: 'Past',      className: 'bg-gray-100 text-gray-400' },
  BlackedOut:{ label: 'Closed',    className: 'bg-gray-200 text-gray-500' },
};

export function StatusBadge({ status }: { status: SlotStatus }) {
  const { label, className } = config[status];
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full', className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
