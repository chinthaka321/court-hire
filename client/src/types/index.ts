export type SlotStatus = 'Available' | 'Held' | 'Booked' | 'Past' | 'BlackedOut' | 'BeyondHorizon';
export type BookingState = 'Completed' | 'Cancelled' | 'NoShow';
export type DayType = 'Weekday' | 'Weekend';
export type PriceBand = 'Day' | 'Night';
export type UserRole = 'User' | 'Admin';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Court {
  id: string;
  name: string;
  slotLengthMinutes: number;
  openingHours: { open: string; close: string };
  dayNightBoundary: string;
  active: boolean;
}

export interface SlotInfo {
  slotStart: string;
  slotEnd: string;
  status: SlotStatus;
  price: number;
  /** True when the active Hold on this slot belongs to the requesting user. */
  heldByMe?: boolean;
}

export interface Hold {
  id: string;
  courtId: string;
  slotStart: string;
  capturedPrice: number;
  expiresAt: string;
}

export interface Booking {
  id: string;
  state: BookingState;
  amountCharged: number;
  slotStarts: string[];
  createdAt: string;
  court: { id: string; name: string };
}

/** Booking as returned by the admin endpoints — includes the customer. */
export interface AdminBooking extends Booking {
  user: { id: string; email: string; name?: string | null };
}

export interface PriceRate {
  id: string;
  courtId: string;
  dayType: DayType;
  band: PriceBand;
  price: number;
}

export interface Blackout {
  id: string;
  courtId: string;
  start: string;
  end: string;
  reason?: string;
}
