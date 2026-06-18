# Double-booking prevention uses a unique constraint spanning Hold and Booking

The `UNIQUE(court_id, slot_start)` constraint must cover both Hold rows and Booking rows — not just Bookings. This means the uniqueness check is enforced at the database level across both tables (or a shared table/view), not in application logic. Application-level checks are a race condition: two concurrent requests can both pass the check before either commits. The DB constraint is the backstop that makes double-booking structurally impossible regardless of concurrency.
