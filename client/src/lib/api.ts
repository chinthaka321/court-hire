import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

// Clerk token kept up to date by the TokenSyncer component via setAuthToken
let authToken: string | null = null;

api.interceptors.request.use((config) => {
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  return config;
});

export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Extracts the server's `{ error }` message from a failed request, or falls back. */
export function apiErrorMessage(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    // A bare 401 means the session expired — never blame the slot/action for it (#36)
    if (e.response?.status === 401) {
      return 'Your session has expired — please sign in again and retry.';
    }
    const data = e.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
  }
  return fallback;
}

// Booking policy values (cancellation window etc.) for honest client dialogs
export const getConfig = () =>
  api.get('/config').then(r => r.data as { cancellationWindowHours: number; bookingHorizonDays: number; holdTtlMinutes: number });

// Courts
export const getCourts = () => api.get('/courts').then(r => r.data);
export const getCourt = (id: string) => api.get(`/courts/${id}`).then(r => r.data);

// Availability
export const getAvailability = (courtId: string, date: string) =>
  api.get('/availability', { params: { courtId, date } }).then(r => r.data);

// Holds
export const createHold = (courtId: string, slotStart: string, slotCount: number = 1) =>
  api.post('/holds', { courtId, slotStart, slotCount }).then(r => r.data);

// Users
export const getMe = () => api.get('/me').then(r => r.data);

// Bookings
export const getMyBookings = () => api.get('/bookings').then(r => r.data);
export const cancelBooking = (id: string) => api.delete(`/bookings/${id}`);
export const rescheduleBooking = (id: string, newSlotStart: string) =>
  api.put(`/bookings/${id}/reschedule`, { newSlotStart });
export const pollBookingByHoldGroup = (holdGroupId: string) =>
  api.get(`/bookings/by-hold-group/${holdGroupId}`).then(r => r.data);

// Admin
export const adminGetBookings = (params?: object) =>
  api.get('/admin/bookings', { params }).then(r => r.data);
export const adminCancelBooking = (id: string) => api.delete(`/admin/bookings/${id}`);
export const adminGetPricing = (courtId: string) =>
  api.get(`/admin/courts/${courtId}/pricing`).then(r => r.data);
export const adminUpsertPricing = (courtId: string, rates: object[]) =>
  api.put(`/admin/courts/${courtId}/pricing`, rates);
export const adminGetBlackouts = (courtId?: string) =>
  api.get('/admin/blackouts', { params: courtId ? { courtId } : {} }).then(r => r.data);
export const adminCreateBlackout = (data: object) =>
  api.post('/admin/blackouts', data).then(r => r.data);
export const adminDeleteBlackout = (id: string) => api.delete(`/admin/blackouts/${id}`);
export const adminGetBlackoutConflicts = (courtId: string, start: string, end: string) =>
  api.get('/admin/blackouts/conflicts', { params: { courtId, start, end } }).then(r => r.data);
export const createCourt = (data: object) => api.post('/courts', data).then(r => r.data);
export const updateCourt = (id: string, data: object) => api.put(`/courts/${id}`, data).then(r => r.data);
export const adminGetCourts = () => api.get('/admin/courts').then(r => r.data);
export const adminToggleCourt = (id: string, active: boolean) =>
  api.patch(`/admin/courts/${id}/active`, { active });
export const deleteCourt = (id: string) => api.delete(`/courts/${id}`);
