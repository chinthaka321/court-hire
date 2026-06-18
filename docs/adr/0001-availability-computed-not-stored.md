# Availability is computed, not stored

Slots are never pre-generated or stored in a table. At read time, the full time grid is derived from `(court opening hours ÷ slot_length)`, then booked, held, and blacked-out intervals are subtracted. This means admin changes to opening hours, slot length, or blackouts take effect immediately with no backfill job. The trade-off is that availability queries do more work at read time, but the grid is small enough (a single day per court) that this is acceptable.

## Considered options

- **Pre-generated slot table**: easier to query, but requires a regeneration job whenever admin config changes. Rejected because config changes would silently produce stale availability until the job ran.
