import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(async (config) => {
  // Clerk token injected by useAuth hook via setAuthToken
  const token = (window as any).__clerkToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function setAuthToken(token: string | null) {
  (window as any).__clerkToken = token;
}

// Courts
export const getCourts = () => api.get('/courts').then(r => r.data);
export const getCourt = (id: string) => api.get(`/courts/${id}`).then(r => r.data);

// Availability
export const getAvailability = (courtId: string, date: string) =>
  api.get('/availability', { params: { courtId, date } }).then(r => r.data);

// Holds
export const createHold = (courtId: string, slotStart: string, slotCount: number = 1) =>
  api.post('/holds', { courtId, slotStart, slotCount }).then(r => r.data);

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
export const createCourt = (data: object) => api.post('/courts', data).then(r => r.data);
export const updateCourt = (id: string, data: object) => api.put(`/courts/${id}`, data).then(r => r.data);
export const adminGetCourts = () => api.get('/admin/courts').then(r => r.data);
export const adminToggleCourt = (id: string, active: boolean) =>
  api.patch(`/admin/courts/${id}/active`, { active });
