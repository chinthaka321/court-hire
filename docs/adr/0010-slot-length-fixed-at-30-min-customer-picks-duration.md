# Slot length fixed at 30 min; customer picks session duration at booking time

The availability grid uses a fixed 30-minute base slot system-wide. `SlotLengthMinutes` is stored on the Court table but is not admin-configurable — it is always 30. Customers choose a session duration (60, 90, or 120 minutes) when booking, which maps to 2, 3, or 4 consecutive base slots forming a Hold group.

This keeps the grid granularity constant and predictable. Allowing per-court slot lengths would require the duration picker to become court-aware, break the uniform pricing calculation (rate-per-slot × N), and add admin complexity for no clear customer benefit.

## Considered options

- **Per-court configurable slot length (e.g. 15/30/45/60 min):** rejected because it couples the admin grid-configuration decision to the customer-facing duration picker, adding UI complexity and making pricing harder to reason about when a block straddles different courts.
- **Fixed 60-min slots, no block bookings:** rejected because customers commonly want 90- or 120-minute sessions and forcing them to book two separate 60-min slots would fragment the calendar and complicate back-to-back conflict detection.
