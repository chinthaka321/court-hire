import { format, parseISO } from 'date-fns';

// Server times are the court's wall-clock time labelled UTC. Strip the offset
// before formatting so we display them as-is instead of shifting to the
// browser's timezone.
function asWallClock(iso: string) {
  return parseISO(iso.replace(/(Z|[+-]\d{2}:?\d{2})$/, ''));
}

export function formatTime(iso: string) {
  return format(asWallClock(iso), 'h:mm a');
}

export function formatDate(iso: string) {
  return format(asWallClock(iso), 'EEE, MMM d');
}

export function formatDateTime(iso: string) {
  return format(asWallClock(iso), 'MMM d, yyyy h:mm a');
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function toDateOnlyString(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}
