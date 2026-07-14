# Polling over push for live updates

V1 has no push infrastructure (no SignalR/WebSockets). Every list and calendar view (availability grid, admin courts, bookings, pricing, blackouts) refreshes via a fixed-interval React Query poll (5s for availability, 10-15s for admin lists) instead of a server-pushed update. This accepts a staleness window — two users can see the same slot as `Available` for up to ~5s — as tolerable because the `UNIQUE(court_id, slot_start)` constraint across Hold and Booking is still the actual double-booking backstop; polling only affects how fast the UI reflects that reality, not correctness. Chosen over SignalR to avoid touching every mutation endpoint with broadcast calls and adding client connection-lifecycle management for a V1 with modest concurrent load.

Revisit if: double-booking *collision attempts* (a user hitting an already-taken slot) become frequent enough in practice to hurt UX, or booking volume makes the polling traffic itself a cost concern.

The polling intervals are hardcoded, not admin-configurable — unlike Hold TTL or the cancellation window, they're not a business policy an admin should tune, just an implementation detail.
