import type { SlotInfo, SlotStatus } from '../types';

export interface DisplaySlot extends SlotInfo {
  slotCount: number;
}

function baseSlotLen(slots: SlotInfo[]): number {
  if (slots.length === 0) return 30;
  return Math.round(
    (new Date(slots[0].slotEnd).getTime() - new Date(slots[0].slotStart).getTime()) / 60000
  );
}

export function groupSlots(slots: SlotInfo[], durationMinutes: number): DisplaySlot[] {
  const base = baseSlotLen(slots);
  const n = Math.max(1, Math.round(durationMinutes / base));
  const result: DisplaySlot[] = [];

  for (let i = 0; i + n <= slots.length; i++) {
    const group = slots.slice(i, i + n);
    const first = group[0];
    const last = group[n - 1];

    let status: SlotStatus = 'Available';
    for (const s of group) {
      if (s.status !== 'Available') {
        status = s.status;
        break;
      }
    }

    result.push({
      slotStart: first.slotStart,
      slotEnd: last.slotEnd,
      status,
      price: status === 'Available' ? group.reduce((sum, s) => sum + s.price, 0) : 0,
      slotCount: n,
    });
  }

  return result;
}
