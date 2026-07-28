import type { AdminBooking, Booking } from '../types';

export function isWalkIn(b: AdminBooking): boolean {
  return !!(b.payerName || b.payerEmail);
}

export function playerDisplayName(b: AdminBooking): string {
  if (isWalkIn(b)) return b.payerName || b.payerEmail || 'Walk-in Customer';
  return b.user?.name || b.user?.email || 'Walk-in (no account)';
}

export function playerSecondaryLine(b: AdminBooking): string | null {
  if (isWalkIn(b)) {
    return b.payerName && b.payerEmail ? b.payerEmail : null;
  }
  return b.user?.name && b.user?.email ? b.user.email : null;
}

export function playerInitial(b: AdminBooking) {
  const source = playerDisplayName(b);
  return source ? source.trim().charAt(0).toUpperCase() : '?';
}

export function bookingDurationMinutes(b: Booking): number {
  return b.slotStarts.length * 30;
}
