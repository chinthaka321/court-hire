import { parseISO } from 'date-fns';

// Fallback only — overwritten at startup by ConfigSyncer once /api/config
// resolves. Must match server's App:TimeZoneId (server/appsettings.json).
let courtTimeZone = 'Asia/Kolkata';

export function setCourtTimeZone(tz: string) {
  courtTimeZone = tz;
}

// Server times are the court's wall-clock time labelled UTC. Strip the offset
// before parsing so we treat the digits as-is instead of shifting them by the
// browser's real timezone.
export function asWallClock(iso: string): Date {
  return parseISO(iso.replace(/(Z|[+-]\d{2}:?\d{2})$/, ''));
}

// Real current instant, reformatted into the court's real timezone digits,
// then parsed the same "naive digits" way as asWallClock — so subtracting or
// comparing the two gives correct relative results regardless of the
// viewer's own browser timezone.
export function courtNow(): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: courtTimeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find(p => p.type === t)!.value);
  return new Date(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
}
